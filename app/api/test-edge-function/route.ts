import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get a short-lived token for authentication
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Make a simple OPTIONS request to check if the function exists and CORS is configured
    const response = await fetch(functionUrl, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
    });

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    console.error("Error testing edge function:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
