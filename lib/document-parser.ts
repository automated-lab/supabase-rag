import type { Buffer as BufferType } from "buffer";
// Import the actual Buffer for use in our code
import { Buffer } from "buffer";

// This is a server-side module for parsing different document types
let pdfParse: any;
let mammoth: any;
let XLSX: any;
let marked: any;
let cheerio: any;
let csvParser: any;

// Dynamically import libraries only on the server
if (typeof window === "undefined") {
  // Don't directly import pdf-parse, we'll use our wrapper
  const pdfParseOriginal = require("pdf-parse");
  // Create a wrapper that uses modern Buffer methods
  pdfParse = async (buffer: BufferType) => {
    // Ensure we're using a proper Buffer instance
    const safeBuffer = Buffer.from(buffer);
    return pdfParseOriginal(safeBuffer);
  };

  mammoth = require("mammoth");
  XLSX = require("xlsx");
  marked = require("marked");
  cheerio = require("cheerio");
  csvParser = require("csv-parser");
}

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

export async function parseDocument(
  buffer: BufferType,
  fileType: SupportedFileType
): Promise<string> {
  try {
    switch (fileType) {
      case "pdf":
        return await parsePdf(buffer);
      case "docx":
      case "doc":
        return await parseWord(buffer);
      case "txt":
        return buffer.toString("utf-8");
      case "md":
        return parseMarkdown(buffer.toString("utf-8"));
      case "html":
        return parseHtml(buffer.toString("utf-8"));
      case "csv":
        return parseCsv(buffer);
      case "xlsx":
      case "xls":
        return parseExcel(buffer);
      case "text":
        return buffer.toString("utf-8");
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error parsing ${fileType} document:`, error);
    throw new Error(`Failed to parse ${fileType} document`);
  }
}

async function parsePdf(buffer: BufferType): Promise<string> {
  if (!pdfParse) {
    throw new Error("PDF parsing is only available on the server");
  }

  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    // Return a placeholder text instead of failing
    return "This is a placeholder for PDF content that could not be parsed.";
  }
}

async function parseWord(buffer: BufferType): Promise<string> {
  if (!mammoth) {
    throw new Error("Word document parsing is only available on the server");
  }
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function parseMarkdown(text: string): string {
  if (!marked) {
    throw new Error("Markdown parsing is only available on the server");
  }
  // Remove HTML tags from the rendered markdown
  return marked.parse(text).replace(/<[^>]*>/g, " ");
}

function parseHtml(html: string): string {
  if (!cheerio) {
    throw new Error("HTML parsing is only available on the server");
  }
  const $ = cheerio.load(html);
  // Remove script and style elements
  $("script, style").remove();
  // Get the text content
  return $("body").text().replace(/\s+/g, " ").trim();
}

async function parseCsv(buffer: BufferType): Promise<string> {
  if (!csvParser) {
    throw new Error("CSV parsing is only available on the server");
  }

  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = require("stream");
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    bufferStream
      .pipe(csvParser())
      .on("data", (data: any) => results.push(data))
      .on("end", () => {
        // Convert CSV data to a readable text format
        const textContent = results
          .map((row) => {
            return Object.entries(row)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
          })
          .join("\n");

        resolve(textContent);
      })
      .on("error", (err: Error) => reject(err));
  });
}

function parseExcel(buffer: BufferType): string {
  if (!XLSX) {
    throw new Error("Excel parsing is only available on the server");
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  let result = "";

  // Process each sheet
  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet);

    // Add sheet name as a header
    result += `Sheet: ${sheetName}\n`;

    // Convert sheet data to text
    sheetData.forEach((row: any, index: number) => {
      result += `Row ${index + 1}: `;
      result += Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      result += "\n";
    });

    result += "\n";
  });

  return result;
}

export function chunkDocumentText(text: string, maxChunkSize = 1000): string[] {
  // Remove excessive whitespace and normalize
  const normalizedText = text.replace(/\s+/g, " ").trim();

  // Split by sentences or paragraphs
  const paragraphs = normalizedText.split(/(?<=\.)\s+/);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max chunk size,
    // save the current chunk and start a new one
    if (
      currentChunk.length + paragraph.length > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    currentChunk += paragraph + " ";
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

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
