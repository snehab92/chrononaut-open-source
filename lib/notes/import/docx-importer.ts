/**
 * DOCX Importer
 *
 * Extracts content from Word documents using mammoth
 */

import mammoth from "mammoth";

export interface DocxImportResult {
  title: string;
  content: string;
}

/**
 * Convert DOCX file to TipTap-compatible HTML
 */
export async function docxToHtml(file: File): Promise<DocxImportResult> {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
      ],
    }
  );

  let html = result.value;

  // Extract title from filename or first heading
  let title = file.name.replace(/\.docx$/i, "");
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) {
    title = h1Match[1].trim();
  }

  // Clean up the HTML for TipTap compatibility
  html = cleanHtmlForTipTap(html);

  return {
    title,
    content: html,
  };
}

/**
 * Clean up HTML for TipTap compatibility
 */
function cleanHtmlForTipTap(html: string): string {
  let cleaned = html;

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, "");

  // Remove style attributes (TipTap doesn't use them)
  cleaned = cleaned.replace(/\s+style="[^"]*"/g, "");

  // Remove class attributes that aren't needed
  cleaned = cleaned.replace(/\s+class="[^"]*"/g, "");

  // Ensure proper list structure
  cleaned = cleaned.replace(/<p>(<li>)/g, "$1");
  cleaned = cleaned.replace(/(<\/li>)<\/p>/g, "$1");

  // Convert mammoth's image tags if present
  // mammoth uses <img> which TipTap can handle

  // Handle line breaks
  cleaned = cleaned.replace(/<br\s*\/?>/g, "<br>");

  return cleaned;
}
