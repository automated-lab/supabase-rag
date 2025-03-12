import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/storage";
import { getDocumentById } from "@/lib/actions";
import { corsHeaders, applyCorsHeaders } from "@/lib/cors";

const BUCKET_NAME = "documents";

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Download request for document ID: ${params.id}`);

    // Await the entire params object first
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      console.error("Document ID is missing or invalid");
      const errorResponse = NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
      return applyCorsHeaders(errorResponse, request);
    }

    // Get document metadata
    try {
      const document = await getDocumentById(id);

      if (!document || !document.metadata?.fileName) {
        console.error(`Document not found or missing filename, ID: ${id}`);
        const errorResponse = NextResponse.json(
          { error: "Document not found or missing filename" },
          { status: 404 }
        );
        return applyCorsHeaders(errorResponse, request);
      }

      const fileName = document.metadata.fileName;
      console.log(`Preparing to download: ${fileName} for document ID: ${id}`);

      // Sanitize the filename to remove spaces and special characters
      const sanitizedFileName =
        document.metadata.sanitizedFileName ||
        fileName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");

      const filePath = `${id}/${sanitizedFileName}`;
      console.log(`Storage path: ${filePath}`);

      // Use admin client for storage operations
      const supabase = createAdminClient();

      // Download the file from Supabase
      console.log(`Attempting to download from storage bucket: ${BUCKET_NAME}`);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (error || !data) {
        console.error("Error downloading file from Supabase:", error);

        // Check if the bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

        if (!bucketExists) {
          console.error(`Storage bucket '${BUCKET_NAME}' does not exist`);
          const errorResponse = NextResponse.json(
            {
              error: "Storage configuration error",
              details: `Bucket '${BUCKET_NAME}' not found`,
            },
            { status: 500 }
          );
          return applyCorsHeaders(errorResponse, request);
        }

        // Check if the file exists in the bucket
        const { data: files } = await supabase.storage
          .from(BUCKET_NAME)
          .list(id);

        console.log(`Files in ${id} directory:`, files);

        const errorResponse = NextResponse.json(
          {
            error: "Failed to download file",
            details: error ? error.message : "File not found in storage",
          },
          { status: 500 }
        );
        return applyCorsHeaders(errorResponse, request);
      }

      // Get the content type
      const contentType = getContentType(fileName);
      console.log(`File downloaded successfully, content type: ${contentType}`);

      // Create a response with the file data
      const response = new NextResponse(data, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Add CORS headers
      return applyCorsHeaders(response, request);
    } catch (docError) {
      console.error(`Error in getDocumentById for ID ${id}:`, docError);
      const errorResponse = NextResponse.json(
        {
          error: "Failed to fetch document metadata",
          details:
            docError instanceof Error ? docError.message : String(docError),
        },
        { status: 500 }
      );
      return applyCorsHeaders(errorResponse, request);
    }
  } catch (error) {
    console.error("Error handling document download:", error);
    const errorResponse = NextResponse.json(
      {
        error: "Failed to process document download",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
    return applyCorsHeaders(errorResponse, request);
  }
}

// Helper function to determine content type
function getContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "html":
    case "htm":
      return "text/html";
    case "csv":
      return "text/csv";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    default:
      return "application/octet-stream";
  }
}
