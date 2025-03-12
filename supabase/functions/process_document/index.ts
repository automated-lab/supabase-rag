import { serve } from "http/server";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "supabase";

// Supabase Edge Functions have a 60-second timeout by default
// This can be extended in paid plans
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the document ID from the request
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create a Supabase client with the Auth context of the function
    const supabase = createClient(
      // Supabase API URL - env var exported by default
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API SERVICE ROLE KEY - env var exported by default
      // Using service role key for admin privileges
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 1. Get the document from the database
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Error fetching document:", docError);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // 2. Update status to processing
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...document.metadata,
          processingStatus: "processing",
        },
      })
      .eq("id", documentId);

    // 3. Get the file from storage
    const fileName = document.metadata.fileName;
    const fileType = document.metadata.type;
    const fileUrl = document.metadata.fileUrl;

    // 4. Fetch the file content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // 5. Process the document
    // This would normally call your document processing functions
    // For this example, we'll simulate the processing with delays

    // Simulate document parsing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update status to chunking
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update status to embedding
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Document processed successfully",
        documentId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);

    // Try to update the document status to error if possible
    try {
      const { documentId } = await req.json();
      if (documentId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

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

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
