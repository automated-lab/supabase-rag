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

    // Get document data
    const document = await getDocumentById(id);
    if (!document) {
      const errorResponse = NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
      return applyCorsHeaders(errorResponse, request);
    }

    // Return the document data with CORS headers
    const response = NextResponse.json(document);
    return applyCorsHeaders(response, request);
  } catch (error) {
    console.error("Error fetching document:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to fetch document" },
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
