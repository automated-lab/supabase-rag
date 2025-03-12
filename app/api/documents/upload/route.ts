import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadDocumentToStorage } from "@/lib/supabase/storage";
import { initializeStorage } from "@/lib/supabase/storage";
import { getFileTypeFromName } from "@/lib/langchain/document-loaders";

export async function POST(request: NextRequest) {
  try {
    // Get the document data from the request
    const { title, fileName, fileContent } = await request.json();

    if (!title || !fileName || !fileContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, "base64");

    // Determine file type from file name
    const fileType = getFileTypeFromName(fileName);

    // Sanitize the filename
    const sanitizedFileName = fileName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    // Initialize storage if needed
    await initializeStorage();

    // Create a Supabase client
    const supabase = createClient();

    // Insert the document with minimal metadata first
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        title,
        content: "", // We'll update this after processing
        metadata: {
          type: fileType,
          fileName: fileName,
          sanitizedFileName: sanitizedFileName,
          size: buffer.length,
          processingStatus: "pending", // Mark as pending
          processingProgress: 0,
          uploadedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (docError) {
      console.error("Error inserting document:", docError);
      return NextResponse.json(
        { error: `Failed to upload ${fileType} document: ${docError.message}` },
        { status: 500 }
      );
    }

    // Upload the original file to storage
    try {
      const fileUrl = await uploadDocumentToStorage(
        fileName,
        buffer,
        document.id
      );

      // Update the document with the file URL
      await supabase
        .from("documents")
        .update({
          metadata: {
            ...document.metadata,
            fileUrl,
            processingStatus: "uploaded", // Mark as uploaded, ready for processing
          },
        })
        .eq("id", document.id);

      // Return success response
      return NextResponse.json({
        success: true,
        message: "Document uploaded successfully",
        documentId: document.id,
        status: "uploaded",
      });
    } catch (storageError) {
      console.error("Error uploading to storage:", storageError);

      // Update document with error status
      await supabase
        .from("documents")
        .update({
          metadata: {
            ...document.metadata,
            processingStatus: "error",
            processingError:
              storageError instanceof Error
                ? storageError.message
                : "Failed to upload to storage",
            errorTimestamp: new Date().toISOString(),
          },
        })
        .eq("id", document.id);

      return NextResponse.json(
        {
          error: "Failed to upload document to storage",
          details:
            storageError instanceof Error ? storageError.message : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in document upload API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
