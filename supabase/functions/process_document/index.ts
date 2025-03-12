import { serve } from "http/server";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "supabase";

// Supabase Edge Functions have a 60-second timeout by default
// This can be extended in paid plans
serve(async (req) => {
  console.log("Process document function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the document ID from the request
    let documentId;
    try {
      const body = await req.json();
      documentId = body.documentId;
      console.log("Received request for document:", documentId);
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!documentId) {
      console.error("Missing document ID in request");
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create a Supabase client with the Auth context of the function
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("Creating Supabase client");
    // Use service role key directly for testing purposes
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the document from the database
    console.log("Fetching document from database");
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Error fetching document:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found", details: docError }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // 2. Update status to processing
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

    // 3. Get the file from storage
    const fileName = document.metadata.fileName;
    const fileType = document.metadata.type;
    const fileUrl = document.metadata.fileUrl;

    console.log(`Processing document: ${fileName} (${fileType})`);

    // 4. Fetch the file content
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

      throw new Error(errorMsg);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(
      `File fetched successfully, size: ${fileBuffer.byteLength} bytes`
    );

    // 5. Process the document
    // This would normally call your document processing functions
    // For this example, we'll simulate the processing with delays

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
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
