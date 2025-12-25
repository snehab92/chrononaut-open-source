/**
 * Markdown Importer
 *
 * Converts Markdown to TipTap-compatible HTML
 */

import matter from "gray-matter";

export interface MarkdownImportResult {
  title: string;
  content: string; // TipTap-compatible HTML
  noteType?: string;
  tags?: string[];
}

/**
 * Convert Markdown to TipTap-compatible HTML
 */
export function markdownToHtml(markdown: string): MarkdownImportResult {
  // Parse YAML frontmatter if present
  let frontmatter: Record<string, unknown> = {};
  let content = markdown;

  try {
    const parsed = matter(markdown);
    frontmatter = parsed.data;
    content = parsed.content;
  } catch {
    // If parsing fails, use raw content
    content = markdown;
  }

  // Extract title from frontmatter or first H1
  let title = (frontmatter.title as string) || "";

  // If no title in frontmatter, try to extract from first H1
  if (!title) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1];
      // Remove the H1 from content since it will be the title
      content = content.replace(/^#\s+.+\n?/, "");
    }
  }

  // Convert markdown to HTML
  const html = convertMarkdownToTipTapHtml(content.trim());

  return {
    title: title || "Imported Note",
    content: html,
    noteType: frontmatter.type as string | undefined,
    tags: frontmatter.tags as string[] | undefined,
  };
}

/**
 * Convert Markdown syntax to TipTap-compatible HTML
 */
function convertMarkdownToTipTapHtml(md: string): string {
  let html = md;

  // Process code blocks first (before other processing)
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => `<pre><code class="language-${lang || "text"}">${escapeHtml(code.trim())}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers (process in order: h3, h2, h1)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic combinations
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^\*\*\*$/gm, "<hr>");

  // Blockquotes (simple single-line)
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Unordered lists
  html = processLists(html, /^[-*] /gm, "ul");

  // Ordered lists
  html = processLists(html, /^\d+\. /gm, "ol");

  // Process remaining paragraphs
  const lines = html.split("\n");
  const processedLines: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for code block markers
    if (trimmed.startsWith("<pre>")) {
      inCodeBlock = true;
      processedLines.push(line);
      continue;
    }
    if (trimmed.endsWith("</pre>")) {
      inCodeBlock = false;
      processedLines.push(line);
      continue;
    }
    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      processedLines.push("");
      continue;
    }

    // Skip lines that are already wrapped in HTML tags
    if (
      trimmed.startsWith("<") &&
      (trimmed.startsWith("<h") ||
        trimmed.startsWith("<p") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<pre"))
    ) {
      processedLines.push(line);
      continue;
    }

    // Wrap plain text in paragraph
    processedLines.push(`<p>${trimmed}</p>`);
  }

  return processedLines.filter((l) => l).join("\n");
}

/**
 * Process markdown lists into HTML
 */
function processLists(html: string, pattern: RegExp, listType: "ul" | "ol"): string {
  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const isListItem = pattern.test(line);

    if (isListItem) {
      if (!inList) {
        result.push(`<${listType}>`);
        inList = true;
      }
      const content = line.replace(pattern, "").trim();
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join("\n");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
