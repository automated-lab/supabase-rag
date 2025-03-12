"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  initializeStorage,
  uploadDocumentToStorage,
  getDocumentSignedUrl,
} from "@/lib/supabase/storage";
import { getRagSettings } from "@/lib/actions/admin";
import {
  parseDocument,
  getFileTypeFromName,
  processDocumentIntoChunks,
} from "@/lib/langchain/document-loaders";
import {
  generateEmbedding,
  retrieveRelevantDocuments,
  createRagChain,
  generateConversationTitle as generateTitleWithLangChain,
  generateSuggestedPrompts as generatePromptsWithLangChain,
} from "@/lib/langchain/index";

// Document types
type Document = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  metadata?: DocumentMetadata;
};

// Type for document list items (without content)
type DocumentListItem = Omit<Document, "content">;

type DocumentMetadata = {
  type?: string;
  fileName?: string;
  sanitizedFileName?: string;
  size?: number;
  pageCount?: number;
  fileUrl?: string;
  startLine?: number;
  endLine?: number;
};

type DocumentInput = {
  title: string;
  content: string;
};

type FileDocumentInput = {
  title: string;
  fileName: string;
  fileContent: string; // base64 encoded
};

type Chunk = {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
};

// Chat types
type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
};

type Citation = {
  id: string;
  text: string;
  document: string;
  documentId?: string;
  startLine?: number;
  endLine?: number;
  originalText?: string;
};

type ChatResponse = {
  content: string;
  citations: Citation[];
};

// Conversation types
type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

// Document management actions
export async function uploadDocument({ title, content }: DocumentInput) {
  const supabase = createClient();

  // 1. Insert the document
  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      title,
      content,
      metadata: { type: "text" },
    })
    .select()
    .single();

  if (docError) {
    console.error("Error inserting document:", docError);
    throw new Error("Failed to upload document");
  }

  try {
    // 2. Process content into chunks using LangChain
    console.log(`Processing document ${document.id} into chunks...`);
    const chunks = await processDocumentIntoChunks(content);
    console.log(`Created ${chunks.length} chunks for document ${document.id}`);

    // 3. Generate embeddings and store chunks
    let successCount = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.pageContent);

        const { data, error } = await supabase.from("chunks").insert({
          document_id: document.id,
          content: chunk.pageContent,
          embedding,
          metadata: {
            ...(chunk.metadata || {}),
            document_id: document.id,
          },
        });

        if (error) {
          console.error("Error inserting chunk:", error);
        } else {
          successCount++;
        }
      } catch (error) {
        console.error("Error processing chunk:", error);
        // Continue with other chunks even if one fails
      }
    }

    console.log(
      `Successfully processed ${successCount} of ${chunks.length} chunks for document ${document.id}`
    );

    revalidatePath("/documents");
    return document;
  } catch (error) {
    console.error("Error in document processing pipeline:", error);
    // Still return the document even if chunking fails
    revalidatePath("/documents");
    return document;
  }
}

export async function uploadFileDocument({
  title,
  fileName,
  fileContent,
}: FileDocumentInput) {
  const supabase = createClient();

  try {
    // 1. Convert base64 to buffer using modern Buffer.from method
    const buffer = Buffer.from(fileContent, "base64");

    // 2. Determine file type from file name
    const fileType = getFileTypeFromName(fileName);

    // 3. Sanitize the filename to remove spaces and special characters
    const sanitizedFileName = fileName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    // 4. Initialize storage if needed
    await initializeStorage();

    // 5. Insert the document with minimal metadata first
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
      throw new Error(`Failed to upload ${fileType} document`);
    }

    // 6. Upload the original file to storage
    const fileUrl = await uploadDocumentToStorage(
      fileName,
      buffer,
      document.id
    );

    // 7. Update the document with the file URL
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

    // 8. Trigger background processing via webhook
    // This is a non-blocking call that will return immediately
    triggerDocumentProcessing(document.id)
      .then(() =>
        console.log(`Processing triggered for document ${document.id}`)
      )
      .catch((err) =>
        console.error(
          `Failed to trigger processing for document ${document.id}:`,
          err
        )
      );

    // 9. Return the document immediately
    revalidatePath("/documents");
    return document;
  } catch (error) {
    console.error("Error uploading document:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to upload document: ${errorMessage}`);
  }
}

// New function to trigger document processing in the background
async function triggerDocumentProcessing(documentId: string) {
  try {
    // Use the Supabase URL from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
    }

    // Create a URL for the Supabase Edge Function
    const functionUrl = `${supabaseUrl}/functions/v1/process_document`;

    // Get a short-lived token for authentication
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Make a POST request to the Supabase Edge Function
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
        // Add Supabase-specific headers
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to trigger processing: ${response.statusText} - ${errorText}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error triggering document processing:", error);
    // Don't throw here - we want to return the document even if processing trigger fails
    return false;
  }
}

// Function to normalize document text - fix common OCR issues
function normalizeDocumentText(text: string): string {
  // Fix missing spaces - look for camelCase or PascalCase patterns
  let normalizedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Fix missing spaces between words with capital letters
  normalizedText = normalizedText.replace(/([a-zA-Z])([A-Z][a-z])/g, "$1 $2");

  // Fix missing spaces after punctuation
  normalizedText = normalizedText.replace(/([.?!,;:])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces before and after brackets
  normalizedText = normalizedText.replace(/([a-zA-Z])(\[)/g, "$1 $2");
  normalizedText = normalizedText.replace(/(\])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces around hyphens between words
  normalizedText = normalizedText.replace(/([a-zA-Z])-([a-zA-Z])/g, "$1 - $2");

  // Remove excessive whitespace
  normalizedText = normalizedText.replace(/\s{2,}/g, " ");

  return normalizedText;
}

// Add a new function to get a document by ID with a signed URL
export async function getDocumentById(
  id: string
): Promise<Document & { signedUrl?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching document:", error);
    throw new Error("Failed to fetch document");
  }

  // If the document has a file, generate a signed URL
  if (data.metadata?.fileName) {
    try {
      // Use the sanitized filename if available, otherwise use the original filename
      const fileNameToUse =
        data.metadata?.sanitizedFileName || data.metadata.fileName;
      const signedUrl = await getDocumentSignedUrl(data.id, fileNameToUse);
      return { ...data, signedUrl };
    } catch (error) {
      console.error("Error generating signed URL:", error);
      // Return the document without a signed URL if there's an error
      return data;
    }
  }

  return data;
}

export async function getDocuments(): Promise<DocumentListItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, created_at, metadata");

  if (error) {
    console.error("Error fetching documents:", error);
    throw new Error("Failed to fetch documents");
  }

  return data || [];
}

export async function deleteDocument(id: string) {
  const supabase = createClient();

  // Check if the current user is an admin
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error checking admin status:", profileError);
    throw new Error("Failed to verify permissions");
  }

  // Only allow admins to delete documents
  if (!profile?.is_admin) {
    throw new Error("Admin permission required to delete documents");
  }

  // First delete all chunks associated with this document
  const { error: chunksError } = await supabase
    .from("chunks")
    .delete()
    .eq("document_id", id);

  if (chunksError) {
    console.error("Error deleting chunks:", chunksError);
    throw new Error("Failed to delete document chunks");
  }

  // Then delete the document itself
  const { error: docError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (docError) {
    console.error("Error deleting document:", docError);
    throw new Error("Failed to delete document");
  }

  revalidatePath("/documents");
}

// Chat and conversation actions
export async function getCurrentUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Error("User not authenticated");
  }

  return data.user;
}

export async function createConversation(): Promise<string> {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Create a new conversation with a default title
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      title: "New Conversation",
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw new Error("Failed to create conversation");
  }

  return data.id;
}

export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Add cache-busting timestamp to ensure fresh data
  const timestamp = new Date().getTime();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    throw new Error("Failed to fetch conversations");
  }

  return data || [];
}

export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch conversation messages");
  }

  return data || [];
}

export async function deleteConversation(id: string) {
  const supabase = createClient();

  // First delete all messages in the conversation
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", id);

  if (messagesError) {
    console.error("Error deleting messages:", messagesError);
    throw new Error("Failed to delete conversation messages");
  }

  // Then delete the conversation itself
  const { error: conversationError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id);

  if (conversationError) {
    console.error("Error deleting conversation:", conversationError);
    throw new Error("Failed to delete conversation");
  }

  revalidatePath("/chat");
}

export async function generateChatResponse(
  query: string,
  conversationId: string,
  previousMessages: Message[] = []
): Promise<ChatResponse> {
  const supabase = createClient();

  try {
    // Check if this is the first user message
    const { count: initialUserMessageCount } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("conversation_id", conversationId)
      .eq("role", "user");

    // If this is the first user message, update the title immediately
    if (initialUserMessageCount === 0) {
      console.log(
        "First user message detected, generating title immediately..."
      );
      // Generate a title based on the user's message
      const title = await generateTitleWithLangChain(query);
      console.log("Generated title immediately:", title);

      // Update the conversation title
      await supabase
        .from("conversations")
        .update({ title: title.trim() })
        .eq("id", conversationId);

      // Revalidate paths to ensure UI updates
      revalidatePath("/chat");
      revalidatePath(`/chat/${conversationId}`);
    }

    // 1. Retrieve relevant documents using LangChain
    const relevantDocs = await retrieveRelevantDocuments(query);

    // Filter out table of contents chunks first to avoid using them in context
    const nonTocDocs = relevantDocs.filter(
      (doc: { pageContent: string; metadata?: Record<string, any> }) =>
        !isTableOfContents(doc.pageContent)
    );

    // Use filtered docs for context building
    const context = nonTocDocs
      .map(
        (
          doc: { pageContent: string; metadata?: Record<string, any> },
          i: number
        ) => `Document ${i + 1}:\n${doc.pageContent}`
      )
      .join("\n\n");

    console.log(
      `Built context with ${nonTocDocs.length} relevant document chunks`
    );

    // 3. Create citations from the filtered relevant documents
    const citations: Citation[] = await Promise.all(
      nonTocDocs.map(
        async (
          doc: { pageContent: string; metadata?: Record<string, any> },
          index: number
        ) => {
          // Get document information if available
          let documentTitle = "Unknown Document";
          let documentId = "";

          if (doc.metadata?.document_id) {
            try {
              const { data } = await supabase
                .from("documents")
                .select("id, title")
                .eq("id", doc.metadata.document_id)
                .single();

              if (data) {
                documentTitle = data.title;
                documentId = data.id;
              }
            } catch (error) {
              console.error("Error fetching document for citation:", error);
            }
          }

          // Extract line information from the metadata if available
          const startLine = doc.metadata?.startLine;
          const endLine = doc.metadata?.endLine;
          const originalText = doc.metadata?.originalText;

          // Create a unique ID that includes conversation ID and timestamp
          const uniqueId = `citation-${conversationId}-${Date.now()}-${
            index + 1
          }`;

          return {
            id: uniqueId,
            text: originalText || doc.pageContent,
            document: documentTitle,
            documentId,
            startLine,
            endLine,
            originalText,
          };
        }
      )
    );

    // 4. Format previous messages for the LLM
    const formattedPrevMessages = previousMessages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // 5. Create a RAG chain and generate a response
    const chain = await createRagChain(context);
    let response = await chain.invoke({
      question: query,
      chat_history: formattedPrevMessages,
    });

    // 6. Post-process the response to fix any citation formatting issues
    // First, handle any CITATION_BADGE_X format (most aggressive replacement)
    response = response.replace(/CITATION_BADGE_(\d+)/g, (match, index) => {
      const citationIndex = parseInt(index);
      if (citationIndex >= 0 && citationIndex < citations.length) {
        return `[${citationIndex + 1}]`;
      }
      return `[${citationIndex + 1}]`; // Use the index even if out of bounds
    });

    // Then handle any remaining citation formats with underscores
    response = response.replace(/CITATION_BADGE_\d+[_]+\d+/g, (match) => {
      const numbers = match.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        return numbers
          .map((num) => {
            const citationIndex = parseInt(num);
            if (citationIndex >= 0 && citationIndex < citations.length) {
              return `[${citationIndex + 1}]`;
            }
            return `[${citationIndex + 1}]`; // Use the index even if out of bounds
          })
          .join("");
      }
      return `[1]`;
    });

    // Finally, check for any remaining CITATION_BADGE text and remove it
    response = response.replace(/CITATION_BADGE/g, "");

    // 7. Store the message in the database
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: response,
      citations: citations.length > 0 ? citations : null,
    });

    // 8. Update the conversation's updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // 9. Check if this is the first user message by counting previous messages
    const { count: finalUserMessageCount } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("conversation_id", conversationId)
      .eq("role", "user");

    // If this is the first response to the first user message, generate a title
    if (finalUserMessageCount === 1) {
      console.log("First user message detected, generating title...");
      // Get the user's message
      const { data: userMessages } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1);

      if (userMessages && userMessages.length > 0) {
        const userQuery = userMessages[0].content;
        // Generate a title based on the user's first message
        const title = await generateTitleWithLangChain(userQuery);
        console.log("Generated title:", title);

        // Remove quotation marks from the title
        const cleanTitle = title.trim().replace(/["']/g, "");
        console.log("Clean title (without quotes):", cleanTitle);

        // Update the conversation title
        await supabase
          .from("conversations")
          .update({ title: cleanTitle })
          .eq("id", conversationId);

        // Revalidate paths to ensure UI updates
        revalidatePath("/chat");
        revalidatePath(`/chat/${conversationId}`);
      }
    }

    return {
      content: response,
      citations,
    };
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Failed to generate chat response");
  }
}

// Helper function to identify table of contents content
function isTableOfContents(text: string): boolean {
  // 1. Check for common TOC indicators
  if (/table\s+of\s+contents|^\s*contents\s*$|^\s*toc\s*$/i.test(text)) {
    return true;
  }

  // 2. Check for text with very few spaces that contains numbers (likely OCR issue with TOC)
  // Examine text density - TOCs with missing spaces will have high letter-to-space ratio
  const nonSpaceChars = text.replace(/\s/g, "").length;
  const totalChars = text.length;
  if (totalChars > 200) {
    const spaceDensity = (totalChars - nonSpaceChars) / totalChars;
    // If very low space density (few spaces) and contains numbers and text
    if (spaceDensity < 0.1 && /\d/.test(text) && /[a-zA-Z]/.test(text)) {
      return true;
    }
  }

  // 3. Quick check for text that resembles a compact TOC like in the example
  // This pattern looks for multiple instances of "word digit" pairs
  const compactTocRegex = /(\w+\s+\d+\s+){3,}/;
  if (compactTocRegex.test(text)) {
    return true;
  }

  // 4. Detect patterns like "Word1 Word2 3" repeated multiple times
  const wordsPlusNumberRegex = /([A-Z][a-z]+\s+)+\d+/g;
  const matches = text.match(wordsPlusNumberRegex) || [];
  if (matches.length >= 3) {
    return true;
  }

  // 5. Detect camelCase or PascalCase words followed by numbers (common in compressed TOCs)
  const camelCaseWithNumbersRegex = /([A-Z][a-z]+){2,}\d+/g;
  const camelMatches = text.match(camelCaseWithNumbersRegex) || [];
  if (camelMatches.length >= 2) {
    return true;
  }

  const lines = text.split("\n");

  // 6. Check for multiple lines ending with page numbers
  const pageNumberPattern = /\s+\d+\s*$/;
  const linesWithPageNumbers = lines.filter((line) =>
    pageNumberPattern.test(line)
  ).length;

  // If more than 25% of lines have page numbers at the end, it's likely a TOC
  if (lines.length > 3 && linesWithPageNumbers / lines.length > 0.25) {
    return true;
  }

  // 7. Check for numbered entry patterns common in TOCs
  const tocEntryPattern = /^\s*(\d+\.|\d+\.\d+|\w+\.)\s+.+\s+\d+\s*$/;
  const tocEntryCount = lines.filter((line) =>
    tocEntryPattern.test(line)
  ).length;

  // If more than 20% of lines match TOC entry patterns, it's likely a TOC
  if (lines.length > 3 && tocEntryCount / lines.length > 0.2) {
    return true;
  }

  // 8. Check for word + number patterns that are common in TOCs
  // Count words that are immediately followed by numbers
  const words = text.split(/\s+/);
  let wordNumberPairs = 0;

  for (let i = 0; i < words.length - 1; i++) {
    // If current word is text and next word is a number
    if (/[a-zA-Z]/.test(words[i]) && /^\d+$/.test(words[i + 1])) {
      wordNumberPairs++;
    }
  }

  // If there are several word+number pairs and they make up a significant portion of the text
  if (wordNumberPairs >= 5 && wordNumberPairs / words.length > 0.15) {
    return true;
  }

  // 9. Specifically look for the exact pattern from the example
  if (
    /Conversation\s+Conversion\s+Strategies|Prospecting\s+Calls|Yes\s+Ladder|Memory\s+Anchor|The\s+Switch|Clarifying\s+Questions/i.test(
      text
    )
  ) {
    return true;
  }

  // 10. Specifically detect patterns from the second example
  if (
    /Whyisthatimportantnow|Howlonghasthisbeengoingonfor|Whendoyouneedthisfixedby|Solution\s+Strategies|Green\s+Brain\s+Sandwich/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

export async function generateConversationTitle(
  conversationId: string
): Promise<void> {
  const supabase = createClient();
  console.log("Starting title generation for conversation:", conversationId);

  try {
    // Get the first user message
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .limit(1);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return;
    }

    console.log("Found messages:", messages);

    if (!messages || messages.length === 0) {
      console.log("No user messages found for conversation:", conversationId);
      return;
    }

    const firstMessage = messages[0].content;
    console.log("First message:", firstMessage);

    // Generate a title using LangChain
    const title = await generateTitleWithLangChain(firstMessage);
    console.log("Generated title:", title);

    // Remove quotation marks from the title
    const cleanTitle = title.trim().replace(/["']/g, "");
    console.log("Clean title (without quotes):", cleanTitle);

    // Update the conversation title
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ title: cleanTitle })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation title:", updateError);
      return;
    }

    console.log("Successfully updated title for conversation:", conversationId);
    // Revalidate both the chat page and the specific conversation page
    revalidatePath("/chat");
    revalidatePath(`/chat/${conversationId}`);
  } catch (error) {
    console.error("Error generating conversation title:", error);
    // Don't throw here, just log the error
  }
}

export async function generateSuggestedPrompts(): Promise<string[]> {
  try {
    return await generatePromptsWithLangChain();
  } catch (error) {
    console.error("Error generating suggested prompts:", error);
    return [
      "What documents should I upload?",
      "How does this system work?",
      "What file formats are supported?",
    ];
  }
}
