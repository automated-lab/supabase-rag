import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Document API functions
 */
export const documentApi = {
  /**
   * Get all documents
   */
  getAll: async () => {
    const response = await supabase.functions.invoke("documents", {
      method: "GET",
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  /**
   * Get a document by ID
   */
  getById: async (id: string) => {
    const response = await supabase.functions.invoke(`documents/${id}`, {
      method: "GET",
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  /**
   * Download a document by ID
   * Returns a URL that can be used to download the document
   */
  getDownloadUrl: async (id: string) => {
    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const functionUrl = `${baseUrl}/functions/v1/documents/download/${id}`;

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || "";

    // Return the URL with instructions to add the token as a header
    return {
      url: functionUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  },

  /**
   * Download a document by ID directly
   * Returns the file data
   */
  download: async (id: string) => {
    const response = await supabase.functions.invoke(
      `documents/download/${id}`,
      {
        method: "GET",
      }
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },
};
