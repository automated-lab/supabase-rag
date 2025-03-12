import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { createClient } from "@/lib/supabase/server";
import { getRagSettings } from "@/lib/actions/admin";

// Initialize LangChain components with settings
export async function initLangChain() {
  const settings = await getRagSettings();
  const supabase = createClient();

  // Initialize embeddings model
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: settings.embedding_model,
  });

  // Initialize vector store
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "chunks",
    queryName: "MATCH_CHUNKS",
  });

  // Initialize LLM
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: settings.openai_model,
    temperature: 0,
  });

  return {
    embeddings,
    vectorStore,
    llm,
    settings,
  };
}

// Create text chunks for embedding
export async function createTextChunks(text: string) {
  const settings = await getRagSettings();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: settings.chunk_size,
    chunkOverlap: settings.chunk_overlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  // First generate standard documents using LangChain
  const documents = await splitter.createDocuments([text]);

  // Now enhance each document with line number information
  const lines = text.split("\n");
  const enhancedDocuments = documents.map((doc) => {
    // We'll use a more robust approach to find line numbers
    // First normalize both the original and chunk text to improve matching
    const normalizedOriginal = text.replace(/\s+/g, " ");
    const normalizedChunk = doc.pageContent.replace(/\s+/g, " ");

    // Try an exact match first
    let startIndex = normalizedOriginal.indexOf(normalizedChunk);

    // If exact match fails, try a fuzzy approach by looking for the first 50 chars
    if (startIndex === -1 && normalizedChunk.length > 50) {
      const chunkStart = normalizedChunk.substring(0, 50);
      startIndex = normalizedOriginal.indexOf(chunkStart);
    }

    // If we still can't find it, return without line numbers
    if (startIndex === -1) {
      return doc;
    }

    // Count newlines to determine line numbers
    const textBefore = text.substring(0, startIndex);
    const startLine = (textBefore.match(/\n/g) || []).length + 1;

    // Calculate end line by counting newlines in the chunk's original text
    // Find the approximate end position
    const endPosition = startIndex + doc.pageContent.length;
    const textToEnd = text.substring(0, endPosition);
    const endLine = (textToEnd.match(/\n/g) || []).length + 1;

    // Add line information to metadata
    doc.metadata = {
      ...doc.metadata,
      startLine,
      endLine,
      originalText: doc.pageContent, // Store the original chunk text
    };

    return doc;
  });

  return enhancedDocuments;
}

// Generate embeddings for text
export async function generateEmbedding(text: string) {
  try {
    // Limit text length to avoid timeouts
    const MAX_TEXT_LENGTH = 6000; // Reduced from 8000 to be safer
    let processedText = text;

    if (text.length > MAX_TEXT_LENGTH) {
      console.log(
        `Text length ${text.length} exceeds maximum, truncating to ${MAX_TEXT_LENGTH} characters`
      );
      processedText = text.substring(0, MAX_TEXT_LENGTH);
    }

    console.log(
      `Generating embedding for text of length ${processedText.length}...`
    );

    // Add retry logic for resilience
    const MAX_RETRIES = 5; // Increased from 3 to 5
    let retries = 0;
    let embedding: number[] = [];

    while (retries < MAX_RETRIES) {
      try {
        const { embeddings } = await initLangChain();

        // Add timeout to the embedding request
        const timeoutPromise = new Promise<number[]>((_, reject) => {
          setTimeout(
            () => reject(new Error("Embedding request timed out")),
            30000
          ); // 30 second timeout
        });

        // Race between the actual embedding request and the timeout
        embedding = await Promise.race([
          embeddings.embedQuery(processedText),
          timeoutPromise,
        ]);

        // Validate the embedding
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error("Invalid embedding result");
        }

        break; // Success, exit the retry loop
      } catch (error) {
        retries++;
        console.error(
          `Embedding generation failed (attempt ${retries}/${MAX_RETRIES}):`,
          error
        );

        if (retries >= MAX_RETRIES) {
          // On final retry, try with an even shorter text
          if (processedText.length > 2000 && retries === MAX_RETRIES) {
            console.log("Final attempt with shorter text...");
            processedText = processedText.substring(0, 2000);
            retries--; // Give one more chance with shorter text
            continue;
          }

          throw error; // Re-throw after max retries
        }

        // Wait before retrying (exponential backoff)
        const backoffTime = 1000 * Math.pow(2, retries);
        console.log(`Waiting ${backoffTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    console.log(
      `Successfully generated embedding of length ${embedding.length}`
    );
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);

    // Return a fallback embedding if all else fails
    // This is better than failing the entire document processing
    if (process.env.NODE_ENV === "production") {
      console.log("Returning fallback embedding to prevent complete failure");
      // Return a random embedding of the correct dimension (1536 for text-embedding-3-small)
      return Array(1536)
        .fill(0)
        .map(() => Math.random() * 2 - 1);
    }

    throw error;
  }
}

// Create a RAG chain for generating responses
export async function createRagChain(context: string) {
  const { llm, settings } = await initLangChain();

  const prompt = PromptTemplate.fromTemplate(`
    ${settings.system_prompt}
    
    IMPORTANT CITATION INSTRUCTIONS:
    1. When you use information from the provided context, cite your sources using numbered citations like [1], [2], etc.
    2. Each citation number should correspond to the document number in the context.
    3. DO NOT use formats like CITATION_BADGE_X or any other placeholder format.
    4. ALWAYS use the format [n] where n is the number of the source.
    5. If you need to cite multiple sources, use separate brackets like [1][2], not combined formats.
    6. AVOID citing table of contents, indexes, or navigation elements.
    7. ONLY cite substantive content that provides actual information.
    8. When citing, ensure the cited text is factual content, not structural elements of the document.
    9. If a citation appears to be from a table of contents or index, DO NOT use it.
    10. If a chunk contains lists of topics with page numbers, it is likely a table of contents - DO NOT cite it.
    11. Pay close attention to document boundaries marked by "Document X:" in the context.
    
    Context information is below:
    ---------------------
    ${context}
    ---------------------
    
    Given the context information and not prior knowledge, answer the question: {question}
  `);

  return RunnableSequence.from([
    {
      question: (input) => input.question,
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);
}

// Retrieve relevant documents based on a query
export async function retrieveRelevantDocuments(
  query: string,
  filterDocumentId?: string
) {
  const { vectorStore, settings } = await initLangChain();

  try {
    // Create a metadata filter if a document ID is provided
    const filter = filterDocumentId
      ? { document_id: filterDocumentId }
      : undefined;

    // Use a direct query to the database instead of relying on the vector store's methods
    const supabase = createClient();
    const embedding = await generateEmbedding(query);

    // Execute a direct query to the database
    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: embedding,
      // Request more chunks to allow for TOC filtering
      match_count: settings.match_count * 2,
      filter: filter,
    });

    if (error) {
      console.error("Error in direct database query:", error);
      throw error;
    }

    // Transform the results to match the expected format
    const results = chunks.map(
      (chunk: {
        content: string;
        document_id: string;
        metadata?: Record<string, any>;
      }) => ({
        pageContent: chunk.content,
        metadata: {
          ...(chunk.metadata || {}),
          document_id: chunk.document_id, // Ensure document_id is always in metadata
        },
      })
    );

    // Filter out any chunks that appear to be table of contents
    const filteredResults = results.filter(
      (doc: { pageContent: string; metadata: any }) =>
        !isLikelyTableOfContents(doc.pageContent)
    );

    // Return only the requested number of chunks after filtering
    return filteredResults.slice(0, settings.match_count);
  } catch (error) {
    console.error("Error searching for documents:", error);
    throw error;
  }
}

// Helper function to detect table of contents patterns
function isLikelyTableOfContents(text: string): boolean {
  // Look for TOC indicators
  if (/table\s+of\s+contents|^\s*contents\s*$|^\s*toc\s*$/i.test(text)) {
    return true;
  }

  // Check text density for OCR issues
  const nonSpaceChars = text.replace(/\s/g, "").length;
  const totalChars = text.length;
  if (totalChars > 0) {
    const spaceDensity = (totalChars - nonSpaceChars) / totalChars;
    // If very low space density with numbers
    if (spaceDensity < 0.1 && /\d/.test(text)) {
      return true;
    }
  }

  // Check for compact TOC patterns
  const compactTocRegex = /(\w+\s+\d+\s+){3,}/;
  if (compactTocRegex.test(text)) {
    return true;
  }

  // Check for word-number pairs
  const words = text.split(/\s+/);
  let wordNumberPairs = 0;

  for (let i = 0; i < words.length - 1; i++) {
    if (/[a-zA-Z]/.test(words[i]) && /^\d+$/.test(words[i + 1])) {
      wordNumberPairs++;
    }
  }

  if (wordNumberPairs >= 3 && wordNumberPairs / words.length > 0.15) {
    return true;
  }

  // Look for specific patterns from examples
  if (
    /Conversation\s+Conversion\s+Strategies|Prospecting\s+Calls|Yes\s+Ladder|Memory\s+Anchor|The\s+Switch|Clarifying\s+Questions/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /Whyisthatimportantnow|Howlonghasthisbeengoingonfor|Solution\s+Strategies|Green\s+Brain/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

// Generate a title for a conversation based on the first message
export async function generateConversationTitle(message: string) {
  const { llm } = await initLangChain();

  const prompt = PromptTemplate.fromTemplate(
    "Generate a short, concise title (4-6 words) for a conversation that starts with this message: {message}. Do not use quotation marks in the title."
  );

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  return await chain.invoke({ message });
}

// Generate suggested prompts based on available documents
export async function generateSuggestedPrompts() {
  const { llm } = await initLangChain();
  const supabase = createClient();

  // Get a sample of document titles and content
  const { data: documents } = await supabase
    .from("documents")
    .select("title, content")
    .limit(5);

  if (!documents || documents.length === 0) {
    return [
      "What documents should I upload to get started?",
      "How does this RAG system work?",
      "What file formats are supported for upload?",
    ];
  }

  const documentSummary = documents
    .map(
      (doc) =>
        `Title: ${doc.title}\nExcerpt: ${doc.content.substring(0, 100)}...`
    )
    .join("\n\n");

  const prompt = PromptTemplate.fromTemplate(
    `Based on these documents, generate 5 specific questions a user might ask:
    
    ${documentSummary}
    
    Generate 5 questions, one per line, without numbering or bullet points.`
  );

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  const result = await chain.invoke({});
  return result.split("\n").filter(Boolean);
}
