import type { Buffer } from "buffer"

// This is a server-side module
let pdfParse: any

// Dynamically import pdf-parse only on the server
if (typeof window === "undefined") {
  // Using dynamic import for server-side only
  pdfParse = require("pdf-parse")
}

export async function parsePdf(pdfBuffer: Buffer): Promise<string> {
  try {
    if (!pdfParse) {
      throw new Error("PDF parsing is only available on the server")
    }

    const data = await pdfParse(pdfBuffer)

    // Return the text content
    return data.text
  } catch (error) {
    console.error("Error parsing PDF:", error)
    throw new Error("Failed to parse PDF document")
  }
}

export function chunkPdfText(text: string, maxChunkSize = 1000): string[] {
  // Remove excessive whitespace and normalize
  const normalizedText = text.replace(/\s+/g, " ").trim()

  // Split by sentences or paragraphs
  const paragraphs = normalizedText.split(/(?<=\.)\s+/)

  const chunks: string[] = []
  let currentChunk = ""

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max chunk size,
    // save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ""
    }

    currentChunk += paragraph + " "
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

