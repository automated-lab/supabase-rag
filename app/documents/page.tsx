import { DocumentList } from "@/components/documents/document-list";
import { UploadDocument } from "@/components/documents/upload-document";
import { Separator } from "@/components/ui/separator";
import { initializeStorage } from "@/lib/supabase/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

export default async function DocumentsPage() {
  // Initialize storage when the page loads
  let storageInfo = null;
  try {
    storageInfo = await initializeStorage();
  } catch (error) {
    console.error("Error initializing storage:", error);
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage your knowledge base documents
          </p>
        </div>

        {storageInfo?.useMockStorage && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Using Local Storage</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Unable to connect to Supabase Storage. Using local temporary
              storage instead. Uploaded files will be stored temporarily and may
              not persist between sessions.
            </AlertDescription>
          </Alert>
        )}

        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <UploadDocument />
          </div>
          <div>
            <DocumentList />
          </div>
        </div>
      </div>
    </div>
  );
}
