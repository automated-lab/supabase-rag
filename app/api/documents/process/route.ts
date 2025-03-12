import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseDocument,
  getFileTypeFromName,
  processDocumentIntoChunks,
} from "@/lib/langchain/document-loaders";
import { generateEmbedding } from "@/lib/langchain/index";
import { normalizeDocumentText } from "@/lib/utils";

// Maximum execution time: 60 seconds (Vercel's maximum for Edge functions)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. Get the document ID from the request
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // 2. Get the document from the database
    const supabase = createClient();
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Error fetching document:", docError);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // 3. Update status to processing
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          processingStatus: "processing",
        },
      })
      .eq("id", documentId);

    // 4. Get the file from storage
    const fileName = document.metadata.fileName;
    const fileType = document.metadata.type || getFileTypeFromName(fileName);

    // 5. Parse the document to extract text
    console.log(`Parsing ${fileType} document: ${fileName}`);

    // Get the file content from the URL
    const fileUrl = document.metadata.fileUrl;
    const fileResponse = await fetch(fileUrl);
    const fileBuffer = await fileResponse.arrayBuffer();

    const { text: extractedText, metadata: extractedMetadata } =
      await parseDocument(Buffer.from(fileBuffer), fileType);

    // Apply text normalization to fix common OCR issues
    const normalizedText = normalizeDocumentText(extractedText);

    // 6. Update the document with the extracted text
    await supabase
      .from("documents")
      .update({
        content: normalizedText,
        metadata: {
          ...document.metadata,
          ...extractedMetadata,
          processingStatus: "chunking",
        },
      })
      .eq("id", documentId);

    // 7. Process content into chunks
    console.log(`Processing document ${documentId} into chunks...`);
    const chunks = await processDocumentIntoChunks(normalizedText);
    console.log(`Created ${chunks.length} chunks for document ${documentId}`);

    // 8. Generate embeddings and store chunks
    const BATCH_SIZE = 3; // Process 3 chunks at a time
    let successCount = 0;

    // Update status to embedding
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          ...extractedMetadata,
          processingStatus: "embedding",
          totalChunks: chunks.length,
        },
      })
      .eq("id", documentId);

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);

      // Process each chunk in the batch
      const batchPromises = batchChunks.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk.pageContent);

          const { error } = await supabase.from("chunks").insert({
            document_id: documentId,
            content: chunk.pageContent,
            embedding,
            metadata: {
              ...(chunk.metadata || {}),
              document_id: documentId,
              fileName,
              fileType,
            },
          });

          if (error) {
            console.error("Error inserting chunk:", error);
            return false;
          }
          return true;
        } catch (error) {
          console.error("Error processing chunk:", error);
          return false;
        }
      });

      // Wait for the current batch to complete
      const batchResults = await Promise.all(batchPromises);
      successCount += batchResults.filter(Boolean).length;

      // Update processing status after each batch
      await supabase
        .from("documents")
        .update({
          metadata: {
            ...document.metadata,
            ...extractedMetadata,
            processingStatus: `processed ${successCount} of ${chunks.length} chunks`,
            processingProgress: Math.round(
              (successCount / chunks.length) * 100
            ),
          },
        })
        .eq("id", documentId);

      // Add a small delay between batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 9. Final update to mark processing as complete
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          ...extractedMetadata,
          processingStatus: "complete",
          processingProgress: 100,
          totalChunks: chunks.length,
          successfulChunks: successCount,
          completedAt: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    console.log(
      `Successfully processed ${successCount} of ${chunks.length} chunks for document ${documentId}`
    );

    return NextResponse.json({ success: true, documentId });
  } catch (error) {
    console.error("Error in document processing:", error);

    // Try to update the document status to error
    try {
      const { documentId } = await request.json();
      if (documentId) {
        const supabase = createClient();
        await supabase
          .from("documents")
          .update({
            metadata: {
              processingStatus: "error",
              processingError:
                error instanceof Error ? error.message : "Unknown error",
              errorTimestamp: new Date().toISOString(),
            },
          })
          .eq("id", documentId);
      }
    } catch (updateError) {
      console.error("Failed to update document status:", updateError);
    }

    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
