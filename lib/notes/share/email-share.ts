/**
 * Email Share Module
 *
 * Handles sharing notes via email using mailto: links
 * Uses a hybrid approach:
 * - Short notes: Content goes directly in email body
 * - Long notes: Download DOCX + mailto with attachment instructions
 */

import { downloadDocx } from "../export/docx-exporter";
import { getPlainTextFromHtml } from "../export";

export interface ShareOptions {
  noteTitle: string;
  noteContent: string;
  noteType?: string;
  tags?: string[];
  recipientEmail?: string;
}

// Maximum characters for email body (conservative limit for mailto)
const MAX_BODY_LENGTH = 1500;

/**
 * Share note via email
 * Automatically determines best method based on content length
 */
export async function shareViaEmail(options: ShareOptions): Promise<void> {
  const plainText = getPlainTextFromHtml(options.noteContent);
  const isShortContent = plainText.length <= MAX_BODY_LENGTH;

  if (isShortContent) {
    // Short content - put directly in email body
    shareDirectly(options, plainText);
  } else {
    // Long content - download file and open mailto
    await shareWithAttachment(options);
  }
}

/**
 * Share note by pasting content directly into email body
 * For long content, text will be truncated with a notice
 */
export function shareViaPaste(options: ShareOptions): void {
  const plainText = getPlainTextFromHtml(options.noteContent);
  shareDirectly(options, plainText);
}

/**
 * Share note by downloading as a file to attach
 */
export async function shareViaDownload(options: ShareOptions): Promise<void> {
  await shareWithAttachment(options);
}

/**
 * Share note directly in email body (for short content)
 */
function shareDirectly(options: ShareOptions, plainText: string): void {
  const subject = encodeURIComponent(options.noteTitle);

  let body = `${options.noteTitle}\n`;
  body += "─".repeat(40) + "\n\n";
  body += plainText;

  if (options.tags?.length) {
    body += "\n\n" + "─".repeat(40);
    body += `\nTags: ${options.tags.join(", ")}`;
  }

  body += "\n\n---\nShared from Chrononaut";

  const encodedBody = encodeURIComponent(body);
  const mailto = options.recipientEmail
    ? `mailto:${options.recipientEmail}?subject=${subject}&body=${encodedBody}`
    : `mailto:?subject=${subject}&body=${encodedBody}`;

  window.location.href = mailto;
}

/**
 * Share note with attachment (for long content)
 * Downloads DOCX first, then opens mailto
 */
async function shareWithAttachment(options: ShareOptions): Promise<void> {
  // Download the DOCX file first
  await downloadDocx(options.noteContent, {
    noteTitle: options.noteTitle,
    noteType: options.noteType,
    tags: options.tags,
  });

  // Short delay to ensure download started
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Open mailto with instructions
  const subject = encodeURIComponent(`Sharing: ${options.noteTitle}`);
  const body = encodeURIComponent(
    `Hi,\n\n` +
      `I'm sharing "${options.noteTitle}" with you.\n\n` +
      `Please find the attached document (the file "${options.noteTitle}.docx" should have just downloaded).\n\n` +
      `---\nShared from Chrononaut`
  );

  const mailto = options.recipientEmail
    ? `mailto:${options.recipientEmail}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;

  window.location.href = mailto;
}

/**
 * Check if content can be shared directly (without attachment)
 */
export function canShareDirectly(htmlContent: string): boolean {
  const plainText = getPlainTextFromHtml(htmlContent);
  return plainText.length <= MAX_BODY_LENGTH;
}

/**
 * Get share method description for UI
 */
export function getShareMethodDescription(htmlContent: string): string {
  if (canShareDirectly(htmlContent)) {
    return "Content will be included in the email body";
  }
  return "A Word document will be downloaded for you to attach";
}
