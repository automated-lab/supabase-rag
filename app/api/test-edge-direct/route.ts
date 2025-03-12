import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL is not defined" },
        { status: 500 }
      );
    }

    // Create a URL for the Supabase Edge Function
    const functionUrl = `${supabaseUrl}/functions/v1/process_document`;
    console.log(`Testing Edge Function at: ${functionUrl}`);

    // Make a direct POST request to the Supabase Edge Function
    // This bypasses authentication to test if the function exists
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add Supabase-specific headers
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ documentId: "test-document-id" }),
    });

    // Get the response text
    const responseText = await response.text();

    // Try to parse as JSON if possible
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = null;
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData || responseText,
    });
  } catch (error) {
    console.error("Error testing edge function:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
