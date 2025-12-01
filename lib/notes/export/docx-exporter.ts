/**
 * DOCX Exporter
 *
 * Converts TipTap HTML content to Word DOCX format
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
} from "docx";
import { saveAs } from "file-saver";
import { sanitizeFilename } from "./markdown-exporter";

export interface DocxExportOptions {
  noteTitle: string;
  noteType?: string;
  tags?: string[];
  createdAt?: string;
}

interface ParsedElement {
  type:
    | "heading"
    | "paragraph"
    | "list-item"
    | "blockquote"
    | "hr"
    | "code-block";
  level?: number;
  content: string;
  children?: ParsedTextNode[];
}

interface ParsedTextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

/**
 * Parse HTML to structured elements
 */
function parseHtmlToElements(html: string): ParsedElement[] {
  if (typeof window === "undefined") return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements: ParsedElement[] = [];

  function parseTextContent(node: Node): ParsedTextNode[] {
    const nodes: ParsedTextNode[] = [];

    function processNode(n: Node, styles: { bold?: boolean; italic?: boolean; code?: boolean }) {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.textContent || "";
        if (text) {
          nodes.push({ text, ...styles });
        }
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as Element;
        const tag = el.tagName.toLowerCase();
        const newStyles = { ...styles };

        if (tag === "strong" || tag === "b") newStyles.bold = true;
        if (tag === "em" || tag === "i") newStyles.italic = true;
        if (tag === "code") newStyles.code = true;

        if (tag === "a") {
          const href = el.getAttribute("href");
          nodes.push({ text: el.textContent || "", link: href || undefined });
        } else {
          el.childNodes.forEach((child) => processNode(child, newStyles));
        }
      }
    }

    processNode(node, {});
    return nodes;
  }

  function processElement(el: Element): void {
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case "h1":
        elements.push({
          type: "heading",
          level: 1,
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "h2":
        elements.push({
          type: "heading",
          level: 2,
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "h3":
        elements.push({
          type: "heading",
          level: 3,
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "p":
        elements.push({
          type: "paragraph",
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "li":
        elements.push({
          type: "list-item",
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "blockquote":
        elements.push({
          type: "blockquote",
          content: el.textContent || "",
          children: parseTextContent(el),
        });
        break;
      case "pre":
        elements.push({
          type: "code-block",
          content: el.textContent || "",
        });
        break;
      case "hr":
        elements.push({ type: "hr", content: "" });
        break;
      case "ul":
      case "ol":
      case "div":
        // Process children
        el.querySelectorAll(":scope > *").forEach(processElement);
        break;
      default:
        // For other elements, try processing children
        if (el.children.length > 0) {
          Array.from(el.children).forEach(processElement);
        } else if (el.textContent?.trim()) {
          elements.push({
            type: "paragraph",
            content: el.textContent || "",
            children: parseTextContent(el),
          });
        }
    }
  }

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node as Element);
    }
  });

  return elements;
}

/**
 * Convert text nodes to TextRun objects
 */
function textNodesToRuns(nodes: ParsedTextNode[]): (TextRun | ExternalHyperlink)[] {
  return nodes.map((node) => {
    if (node.link) {
      return new ExternalHyperlink({
        children: [
          new TextRun({
            text: node.text,
            style: "Hyperlink",
          }),
        ],
        link: node.link,
      });
    }
    return new TextRun({
      text: node.text,
      bold: node.bold,
      italics: node.italic,
      font: node.code ? "Courier New" : undefined,
    });
  });
}

/**
 * Convert parsed element to Paragraph
 */
function elementToParagraph(el: ParsedElement): Paragraph {
  switch (el.type) {
    case "heading":
      return new Paragraph({
        children: el.children ? textNodesToRuns(el.children) : [new TextRun(el.content)],
        heading:
          el.level === 1
            ? HeadingLevel.HEADING_1
            : el.level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      });

    case "list-item":
      return new Paragraph({
        children: [
          new TextRun({ text: "\u2022  " }),
          ...(el.children ? textNodesToRuns(el.children) : [new TextRun(el.content)]),
        ],
        spacing: { before: 50, after: 50 },
        indent: { left: 360 },
      });

    case "blockquote":
      return new Paragraph({
        children: el.children
          ? el.children.map((node) => {
              if (node.link) {
                return new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: node.text,
                      style: "Hyperlink",
                      italics: true,
                    }),
                  ],
                  link: node.link,
                });
              }
              return new TextRun({
                text: node.text,
                bold: node.bold,
                italics: true, // Always italic for blockquotes
                color: "666666",
              });
            })
          : [new TextRun({ text: el.content, italics: true, color: "666666" })],
        indent: { left: 720 },
        spacing: { before: 100, after: 100 },
      });

    case "code-block":
      return new Paragraph({
        children: [
          new TextRun({
            text: el.content,
            font: "Courier New",
            size: 20,
          }),
        ],
        spacing: { before: 100, after: 100 },
        shading: { fill: "F0F0F0" },
      });

    case "hr":
      return new Paragraph({
        children: [
          new TextRun({
            text: "\u2500".repeat(50),
            color: "CCCCCC",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      });

    default:
      return new Paragraph({
        children: el.children ? textNodesToRuns(el.children) : [new TextRun(el.content)],
        spacing: { before: 50, after: 50 },
      });
  }
}

/**
 * Convert HTML to DOCX Blob
 */
export async function htmlToDocx(
  html: string,
  options: DocxExportOptions
): Promise<Blob> {
  const elements = parseHtmlToElements(html);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: options.noteTitle,
                bold: true,
                size: 48,
              }),
            ],
            spacing: { after: 200 },
          }),
          // Metadata line
          new Paragraph({
            children: [
              new TextRun({
                text: `Type: ${options.noteType || "Document"}`,
                size: 20,
                color: "888888",
              }),
              ...(options.tags?.length
                ? [
                    new TextRun({ text: " | Tags: ", size: 20, color: "888888" }),
                    new TextRun({
                      text: options.tags.join(", "),
                      size: 20,
                      color: "888888",
                    }),
                  ]
                : []),
            ],
            spacing: { after: 400 },
          }),
          // Content
          ...elements.map((el) => elementToParagraph(el)),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Download HTML as DOCX file
 */
export async function downloadDocx(
  html: string,
  options: DocxExportOptions
): Promise<void> {
  const blob = await htmlToDocx(html, options);
  saveAs(blob, `${sanitizeFilename(options.noteTitle)}.docx`);
}
