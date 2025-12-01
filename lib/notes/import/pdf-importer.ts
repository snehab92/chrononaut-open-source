/**
 * PDF Importer
 *
 * Extracts text content from PDF files
 * Note: PDF import is limited to text extraction - formatting may be lost
 */

export interface PdfImportResult {
  title: string;
  content: string;
  warning?: string;
}

/**
 * Import PDF file content
 * Uses PDF.js to extract text from PDF
 */
export async function pdfToHtml(file: File): Promise<PdfImportResult> {
  // Dynamic import of pdfjs-dist for client-side only
  const pdfjsLib = await import("pdfjs-dist");

  // Set up the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const numPages = pdf.numPages;

  // Extract text from each page
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ");

    fullText += pageText + "\n\n";
  }

  // Convert text to simple HTML paragraphs
  const paragraphs = fullText
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  // Get title from filename
  const title = file.name.replace(/\.pdf$/i, "");

  return {
    title,
    content: paragraphs,
    warning:
      numPages > 10
        ? `Imported ${numPages} pages. Some formatting may have been lost during conversion.`
        : undefined,
  };
}
