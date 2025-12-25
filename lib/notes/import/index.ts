/**
 * Notes Import Module
 *
 * Provides utilities for importing notes from various formats
 */

import { markdownToHtml, MarkdownImportResult } from "./markdown-importer";
import { docxToHtml, DocxImportResult } from "./docx-importer";
import { pdfToHtml, PdfImportResult } from "./pdf-importer";

// Re-export utilities
export { markdownToHtml } from "./markdown-importer";
export { docxToHtml } from "./docx-importer";
export { pdfToHtml } from "./pdf-importer";
export type { MarkdownImportResult } from "./markdown-importer";
export type { DocxImportResult } from "./docx-importer";
export type { PdfImportResult } from "./pdf-importer";

export type ImportFormat = "md" | "docx" | "pdf";

export interface ImportResult {
  title: string;
  content: string;
  noteType?: string;
  tags?: string[];
  warning?: string;
}

/**
 * Detect file format from file extension
 */
export function detectFormat(file: File): ImportFormat | null {
  const ext = file.name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "md":
    case "markdown":
      return "md";
    case "docx":
      return "docx";
    case "pdf":
      return "pdf";
    default:
      return null;
  }
}

/**
 * Get list of accepted file types for input elements
 */
export function getAcceptedFileTypes(): string {
  return ".md,.markdown,.docx,.pdf";
}

/**
 * Get MIME types for accepted file formats
 */
export function getAcceptedMimeTypes(): string {
  return "text/markdown,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/pdf,.pdf";
}

/**
 * Import a file and convert to TipTap-compatible HTML
 */
export async function importFile(file: File): Promise<ImportResult> {
  const format = detectFormat(file);

  if (!format) {
    throw new Error(
      "Unsupported file format. Please use .md, .docx, or .pdf files."
    );
  }

  switch (format) {
    case "md": {
      const text = await file.text();
      const result = markdownToHtml(text);
      return {
        title: result.title,
        content: result.content,
        noteType: result.noteType,
        tags: result.tags,
      };
    }
    case "docx": {
      const result = await docxToHtml(file);
      return {
        title: result.title,
        content: result.content,
      };
    }
    case "pdf": {
      const result = await pdfToHtml(file);
      return {
        title: result.title,
        content: result.content,
        warning: result.warning,
      };
    }
  }
}

/**
 * Validate file before import
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check format
  const format = detectFormat(file);
  if (!format) {
    return {
      valid: false,
      error: "Unsupported file format. Please use .md, .docx, or .pdf files.",
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File is too large. Maximum file size is 10MB.",
    };
  }

  return { valid: true };
}
