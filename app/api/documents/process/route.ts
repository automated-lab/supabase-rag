import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Document processing API called");

    // Get the document ID from the request
    const { documentId } = await request.json();

    if (!documentId) {
      console.error("Missing document ID in process request");
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    console.log(`Processing document with ID: ${documentId}`);

    // Create a Supabase client
    const supabase = createClient();

    // Check if the document exists
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Error fetching document:", docError);
      return NextResponse.json(
        { error: "Document not found", details: docError },
        { status: 404 }
      );
    }

    // Update status to processing
    console.log("Updating document status to processing");
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          processingStatus: "processing",
        },
      })
      .eq("id", documentId);

    // Get the file from storage
    const fileName = document.metadata.fileName;
    const fileType = document.metadata.type;
    const fileUrl = document.metadata.fileUrl;

    console.log(`Processing document: ${fileName} (${fileType})`);

    // Fetch the file content
    console.log("Fetching file content from URL:", fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      const errorMsg = `Failed to fetch file: ${fileResponse.statusText}`;
      console.error(errorMsg);

      // Update document with error status
      await supabase
        .from("documents")
        .update({
          metadata: {
            ...document.metadata,
            processingStatus: "error",
            processingError: errorMsg,
            errorTimestamp: new Date().toISOString(),
          },
        })
        .eq("id", documentId);

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(
      `File fetched successfully, size: ${fileBuffer.byteLength} bytes`
    );

    // For now, we'll simulate the processing with delays
    // In a real implementation, you would call your document processing functions here

    // Simulate document parsing
    console.log("Simulating document parsing");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update status to chunking
    console.log("Updating status to chunking");
    await supabase
      .from("documents")
      .update({
        content: "Processed content would go here",
        metadata: {
          ...document.metadata,
          processingStatus: "chunking",
        },
      })
      .eq("id", documentId);

    // Simulate chunking
    console.log("Simulating document chunking");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update status to embedding
    console.log("Updating status to embedding");
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          processingStatus: "embedding",
          totalChunks: 10, // Example value
        },
      })
      .eq("id", documentId);

    // Simulate embedding generation
    console.log("Simulating embedding generation");
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update progress
      await supabase
        .from("documents")
        .update({
          metadata: {
            ...document.metadata,
            processingStatus: `processed ${i} of 10 chunks`,
            processingProgress: Math.round((i / 10) * 100),
          },
        })
        .eq("id", documentId);
    }

    // Final update to mark processing as complete
    console.log("Marking processing as complete");
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          processingStatus: "complete",
          processingProgress: 100,
          totalChunks: 10,
          successfulChunks: 10,
          completedAt: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    console.log("Document processing completed successfully");
    return NextResponse.json({
      success: true,
      message: "Document processed successfully",
      documentId,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
