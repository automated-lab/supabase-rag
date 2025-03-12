import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const BUCKET_NAME = "documents";
let useMockStorage = false;
const mockStorageDir = path.join(os.tmpdir(), "mock-storage");

// Create an admin client specifically for storage operations
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Initialize storage bucket if it doesn't exist
export async function initializeStorage() {
  try {
    // Use admin client for storage operations
    const supabase = createAdminClient();

    // Check if bucket exists
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing storage buckets:", listError);
      // Fall back to mock storage
      return initMockStorage();
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      // Try to create the bucket
      const { error: createError } = await supabase.storage.createBucket(
        BUCKET_NAME,
        {
          public: false, // Keep documents private
          fileSizeLimit: 20971520, // 20MB limit
        }
      );

      if (createError) {
        console.error("Error creating storage bucket:", createError);
        console.log(
          "Storage bucket creation failed, falling back to mock storage."
        );
        return initMockStorage();
      } else {
        console.log("Storage bucket 'documents' created successfully");
        useMockStorage = false;
      }
    } else {
      console.log("Storage bucket 'documents' already exists");
      useMockStorage = false;
    }

    return { success: true, bucketExists: true, useMockStorage };
  } catch (error) {
    console.error("Error initializing storage:", error);
    return initMockStorage();
  }
}

// Initialize mock storage
async function initMockStorage() {
  try {
    // Create mock storage directory if it doesn't exist
    if (!fs.existsSync(mockStorageDir)) {
      fs.mkdirSync(mockStorageDir, { recursive: true });
    }

    console.log(`Using mock storage at ${mockStorageDir}`);
    useMockStorage = true;
    return { success: true, bucketExists: false, useMockStorage: true };
  } catch (error) {
    console.error("Error initializing mock storage:", error);
    return { success: false, bucketExists: false, useMockStorage: false };
  }
}

// Upload a document to storage
export async function uploadDocumentToStorage(
  fileName: string,
  fileContent: Buffer | string,
  documentId: string
): Promise<string> {
  if (useMockStorage) {
    return uploadToMockStorage(fileName, fileContent, documentId);
  }

  // Use admin client for storage operations
  const supabase = createAdminClient();

  // Create a unique path for the document
  // Sanitize the filename to remove spaces and special characters
  const sanitizedFileName = fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "");
  const filePath = `${documentId}/${sanitizedFileName}`;

  // Upload the file
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileContent, {
      contentType: getContentType(fileName),
      upsert: true,
    });

  if (error) {
    console.error("Error uploading document to storage:", error);
    // Fall back to mock storage
    return uploadToMockStorage(fileName, fileContent, documentId);
  }

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return data.publicUrl;
}

// Upload to mock storage
async function uploadToMockStorage(
  fileName: string,
  fileContent: Buffer | string,
  documentId: string
): Promise<string> {
  try {
    // Create document directory if it doesn't exist
    const docDir = path.join(mockStorageDir, documentId);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(docDir, fileName);
    const content =
      typeof fileContent === "string" ? Buffer.from(fileContent) : fileContent;
    fs.writeFileSync(filePath, content);

    // Return a mock URL
    return `mock-storage://${documentId}/${fileName}`;
  } catch (error) {
    console.error("Error uploading to mock storage:", error);
    throw new Error("Failed to upload document to mock storage");
  }
}

// Get a signed URL for a document (valid for a limited time)
export async function getDocumentSignedUrl(
  documentId: string,
  fileName: string
): Promise<string> {
  if (useMockStorage) {
    return getMockSignedUrl(documentId, fileName);
  }

  // Use our internal API route instead of direct Supabase URLs
  // This completely bypasses the Next.js cache key issue
  return `/api/documents/${documentId}/download`;
}

// Get a mock signed URL
function getMockSignedUrl(documentId: string, fileName: string): string {
  const filePath = path.join(mockStorageDir, documentId, fileName);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found in mock storage");
  }

  return `mock-storage://${documentId}/${fileName}?signed=true`;
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
