import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { createTextChunks } from "./index";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type SupportedFileType =
  | "pdf"
  | "docx"
  | "doc"
  | "txt"
  | "md"
  | "html"
  | "csv"
  | "xlsx"
  | "xls"
  | "text"; // For direct text input

// Get file type from file name
export function getFileTypeFromName(fileName: string): SupportedFileType {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "pdf";
    case "docx":
    case "doc":
      return extension as SupportedFileType;
    case "txt":
      return "txt";
    case "md":
      return "md";
    case "html":
    case "htm":
      return "html";
    case "csv":
      return "csv";
    case "xlsx":
    case "xls":
      return extension as SupportedFileType;
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
}

// Create a temporary file from buffer
async function createTempFile(
  buffer: Buffer,
  extension: string
): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `temp-${Date.now()}.${extension}`);

  await fs.promises.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

// Parse document using LangChain loaders
export async function parseDocument(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<{ text: string; metadata: Record<string, any> }> {
  try {
    let docs: Document[] = [];
    let metadata: Record<string, any> = {};

    switch (fileType) {
      case "pdf": {
        const tempFilePath = await createTempFile(buffer, "pdf");
        // Use custom PDF loader options to better handle document structure
        const loader = new PDFLoader(tempFilePath, {
          splitPages: true,
          pdfjs: () => import("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js"),
        });
        docs = await loader.load();

        // Clean up temp file
        await fs.promises.unlink(tempFilePath);

        // Extract metadata
        if (docs.length > 0 && docs[0].metadata) {
          metadata = {
            ...docs[0].metadata,
            pageCount: docs.length,
          };
        }

        // Additional processing for PDF documents
        // Filter out pages that appear to be table of contents
        docs = docs.filter((doc) => !isLikelyTableOfContents(doc.pageContent));

        break;
      }

      case "docx": {
        const tempFilePath = await createTempFile(buffer, "docx");
        const loader = new DocxLoader(tempFilePath);
        docs = await loader.load();

        // Clean up temp file
        await fs.promises.unlink(tempFilePath);
        break;
      }

      case "csv": {
        const tempFilePath = await createTempFile(buffer, "csv");
        const loader = new CSVLoader(tempFilePath);
        docs = await loader.load();

        // Clean up temp file
        await fs.promises.unlink(tempFilePath);
        break;
      }

      // For all other file types, convert to text directly
      case "doc":
      case "txt":
      case "md":
      case "html":
      case "xlsx":
      case "xls":
      case "text":
        return {
          text: buffer.toString("utf-8"),
          metadata: { type: fileType },
        };

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Combine all documents into a single text
    const text = docs.map((doc) => doc.pageContent).join("\n\n");

    return { text, metadata };
  } catch (error) {
    console.error(`Error parsing ${fileType} document:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse ${fileType} document: ${errorMessage}`);
  }
}

// Helper function to identify table of contents pages
function isLikelyTableOfContents(text: string): boolean {
  // Check if the text has TOC indicators
  const tocIndicators = [
    /table\s+of\s+contents/i,
    /^\s*contents\s*$/i,
    /^\s*toc\s*$/i,
  ];

  if (tocIndicators.some((pattern) => pattern.test(text))) {
    return true;
  }

  // Check for patterns of numbered entries with page numbers
  // Count lines that match the TOC entry pattern
  const lines = text.split("\n");
  const tocEntryPattern = /^\s*(\d+\.|\d+\.\d+\.?|\w+\.)\s+.+\s+\d+\s*$/;
  const tocEntryCount = lines.filter((line) =>
    tocEntryPattern.test(line)
  ).length;

  // If more than 30% of the lines match TOC patterns, it's likely a TOC
  if (lines.length > 0 && tocEntryCount / lines.length > 0.3) {
    return true;
  }

  return false;
}

// Process document text into chunks for embedding
export async function processDocumentIntoChunks(text: string) {
  try {
    // Preprocess text to handle table of contents
    const preprocessedText = preprocessDocumentText(text);

    // Create chunks using LangChain's text splitter
    const chunks = await createTextChunks(preprocessedText);
    return chunks;
  } catch (error) {
    console.error("Error processing document into chunks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process document into chunks: ${errorMessage}`);
  }
}

// Function to preprocess document text before chunking
function preprocessDocumentText(text: string): string {
  // Remove or filter out common table of contents patterns

  // Pattern 1: Remove "Table of Contents" or "Contents" sections
  // This regex looks for "Table of Contents" or "Contents" header followed by
  // lines with numbers and page numbers until a blank line or new section header
  let processedText = text.replace(
    /(Table of Contents|Contents|TOC)[\s\S]*?\n\s*\n/gi,
    "\n\n"
  );

  // Pattern 2: Remove numbered list patterns that look like TOC entries
  // This targets lines that have the format: number(s). text... page number
  processedText = processedText.replace(
    /^\s*(\d+\.|\d+\.\d+\.?|\w+\.)\s+.+\s+\d+\s*$/gm,
    ""
  );

  // Pattern 3: Remove lines that are just numbers (page numbers in TOC)
  processedText = processedText.replace(/^\s*\d+\s*$/gm, "");

  // Fix text with missing spaces - look for camelCase or PascalCase patterns
  // and insert spaces between them
  processedText = processedText.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Fix missing spaces between words - look for patterns where lowercase letters
  // are followed by capital letters without spacing
  processedText = processedText.replace(/([a-zA-Z])([A-Z][a-z])/g, "$1 $2");

  // Fix missing spaces after punctuation
  processedText = processedText.replace(/([.?!,;:])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces before and after brackets
  processedText = processedText.replace(/([a-zA-Z])(\[)/g, "$1 $2");
  processedText = processedText.replace(/(\])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces around hyphens
  processedText = processedText.replace(/([a-zA-Z])-([a-zA-Z])/g, "$1 - $2");

  // Remove any excessive whitespace created by the replacements
  processedText = processedText.replace(/\s{2,}/g, " ");
  processedText = processedText.replace(/\n{3,}/g, "\n\n");

  return processedText;
}
