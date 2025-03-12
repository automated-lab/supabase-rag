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
    // Await the entire params object first
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    // Get document metadata
    const document = await getDocumentById(id);
    if (!document || !document.metadata?.fileName) {
      const errorResponse = NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
      return applyCorsHeaders(errorResponse, request);
    }

    const fileName = document.metadata.fileName;

    // Sanitize the filename to remove spaces and special characters
    const sanitizedFileName = fileName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const filePath = `${id}/${sanitizedFileName}`;

    // Use admin client for storage operations
    const supabase = createAdminClient();

    // Download the file from Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error || !data) {
      console.error("Error downloading file from Supabase:", error);
      const errorResponse = NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
      return applyCorsHeaders(errorResponse, request);
    }

    // Get the content type
    const contentType = getContentType(fileName);

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
  } catch (error) {
    console.error("Error handling document download:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to process document download" },
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
