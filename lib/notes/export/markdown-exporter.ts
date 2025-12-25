/**
 * Markdown Exporter
 *
 * Converts TipTap HTML content to Markdown format
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export interface MarkdownExportOptions {
  includeMetadata?: boolean;
  noteTitle?: string;
  noteType?: string;
  tags?: string[];
  createdAt?: string;
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(
  html: string,
  options: MarkdownExportOptions = {}
): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Enable GitHub-flavored markdown (tables, strikethrough, etc.)
  turndownService.use(gfm);

  let markdown = "";

  // Add YAML frontmatter if metadata requested
  if (options.includeMetadata) {
    markdown += "---\n";
    if (options.noteTitle) markdown += `title: "${options.noteTitle}"\n`;
    if (options.noteType) markdown += `type: ${options.noteType}\n`;
    if (options.tags?.length)
      markdown += `tags: [${options.tags.map((t) => `"${t}"`).join(", ")}]\n`;
    if (options.createdAt) markdown += `created: ${options.createdAt}\n`;
    markdown += "---\n\n";
  }

  // Add title as H1 if provided and not using metadata
  if (options.noteTitle && !options.includeMetadata) {
    markdown += `# ${options.noteTitle}\n\n`;
  }

  // Convert HTML to markdown
  markdown += turndownService.turndown(html || "");

  return markdown;
}

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "untitled";
}

/**
 * Download content as a Markdown file
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(filename)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
