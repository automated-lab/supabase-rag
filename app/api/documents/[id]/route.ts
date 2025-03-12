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
    console.log(`Fetching document with ID: ${params.id}`);

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

    // Get document data
    try {
      const document = await getDocumentById(id);

      if (!document) {
        console.error(`Document not found with ID: ${id}`);
        const errorResponse = NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
        return applyCorsHeaders(errorResponse, request);
      }

      console.log(`Successfully fetched document: ${document.title}`);

      // Return the document data with CORS headers
      const response = NextResponse.json(document);
      return applyCorsHeaders(response, request);
    } catch (docError) {
      console.error(`Error in getDocumentById for ID ${id}:`, docError);
      const errorResponse = NextResponse.json(
        {
          error: "Failed to fetch document",
          details:
            docError instanceof Error ? docError.message : String(docError),
        },
        { status: 500 }
      );
      return applyCorsHeaders(errorResponse, request);
    }
  } catch (error) {
    console.error("Unexpected error in document API route:", error);
    const errorResponse = NextResponse.json(
      {
        error: "Failed to fetch document",
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
