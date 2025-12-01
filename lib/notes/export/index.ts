/**
 * Notes Export Module
 *
 * Provides utilities for exporting notes to various formats
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { htmlToMarkdown, sanitizeFilename, downloadMarkdown } from "./markdown-exporter";
import { htmlToDocx, downloadDocx } from "./docx-exporter";

// Re-export utilities
export { htmlToMarkdown, downloadMarkdown, sanitizeFilename } from "./markdown-exporter";
export { htmlToDocx, downloadDocx } from "./docx-exporter";

export type ExportFormat = "md" | "docx";

export interface ExportableNote {
  id: string;
  title: string;
  content: string | null;
  note_type?: string;
  tags?: string[];
  created_at?: string;
}

/**
 * Export a single note to the specified format
 */
export async function exportNote(
  note: ExportableNote,
  format: ExportFormat
): Promise<void> {
  const options = {
    noteTitle: note.title,
    noteType: note.note_type,
    tags: note.tags,
    createdAt: note.created_at,
  };

  if (format === "md") {
    const markdown = htmlToMarkdown(note.content || "", {
      includeMetadata: true,
      ...options,
    });
    downloadMarkdown(markdown, note.title);
  } else if (format === "docx") {
    await downloadDocx(note.content || "", options);
  }
}

/**
 * Export multiple notes from a folder
 * Single note: downloads directly
 * Multiple notes: creates a ZIP file
 */
export async function exportFolder(
  notes: ExportableNote[],
  folderName: string,
  format: ExportFormat
): Promise<void> {
  if (notes.length === 0) {
    throw new Error("No notes to export");
  }

  // Single note, just export directly
  if (notes.length === 1) {
    return exportNote(notes[0], format);
  }

  // Multiple notes, create a ZIP file
  const zip = new JSZip();
  const usedFilenames = new Set<string>();

  for (const note of notes) {
    // Handle duplicate filenames by adding a suffix
    let filename = sanitizeFilename(note.title);
    let finalFilename = filename;
    let counter = 1;
    while (usedFilenames.has(finalFilename)) {
      finalFilename = `${filename}_${counter}`;
      counter++;
    }
    usedFilenames.add(finalFilename);

    const options = {
      noteTitle: note.title,
      noteType: note.note_type,
      tags: note.tags,
      createdAt: note.created_at,
    };

    if (format === "md") {
      const markdown = htmlToMarkdown(note.content || "", {
        includeMetadata: true,
        ...options,
      });
      zip.file(`${finalFilename}.md`, markdown);
    } else if (format === "docx") {
      const blob = await htmlToDocx(note.content || "", options);
      zip.file(`${finalFilename}.docx`, blob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${sanitizeFilename(folderName)}-notes.zip`);
}

/**
 * Get the plain text content from HTML for email body
 * Strips HTML tags and returns clean text
 */
export function getPlainTextFromHtml(html: string): string {
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

/**
 * Prepare content for email body
 * Returns truncated plain text suitable for mailto: body
 */
export function prepareEmailBody(
  html: string,
  title: string,
  maxLength: number = 1500
): string {
  const plainText = getPlainTextFromHtml(html);
  const truncated =
    plainText.length > maxLength
      ? plainText.substring(0, maxLength) + "...\n\n[Content truncated - see attached file for full note]"
      : plainText;

  return `${title}\n\n${truncated}`;
}
