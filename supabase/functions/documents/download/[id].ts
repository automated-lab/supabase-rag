import { serve } from "http/server";
import { corsHeaders } from "../../_shared/cors.ts";
import { createClient } from "supabase";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get document ID from URL
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      throw new Error("Document ID is required");
    }

    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get document from the database
    const { data: document, error: docError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (docError) throw docError;
    if (!document) throw new Error("Document not found");

    // Get file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from("documents")
      .download(document.file_path);

    if (fileError) throw fileError;
    if (!fileData) throw new Error("File not found");

    // Return the file with appropriate headers
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        "Content-Type": document.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.filename}"`,
      },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
