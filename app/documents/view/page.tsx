"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentViewer } from "@/components/documents/document-viewer";

// Loading component for Suspense fallback
function DocumentViewerLoading() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/documents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
        </div>
        <div className="p-8 text-center">Loading document...</div>
      </div>
    </div>
  );
}

// Main content component that uses search params
function DocumentViewContent() {
  // Use search params
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      if (!id) {
        setError("No document ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/documents/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        const data = await response.json();
        setDocument(data);
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError(err.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/documents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Link>
            </Button>
          </div>
          <div className="p-8 text-center">Loading document...</div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/documents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Link>
            </Button>
          </div>
          <div className="p-8 text-center text-red-500">
            {error || "Document not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/documents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {document.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            {document.metadata?.type && (
              <span className="uppercase">{document.metadata.type}</span>
            )}
            {document.metadata?.fileName && (
              <span className="ml-2">({document.metadata.fileName})</span>
            )}
          </p>
        </div>

        {document.signedUrl ? (
          <DocumentViewer
            url={document.signedUrl}
            fileName={document.metadata?.fileName || "document"}
            fileType={document.metadata?.type || "unknown"}
          />
        ) : (
          <div className="p-8 border rounded-lg">
            <pre className="whitespace-pre-wrap">{document.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function DocumentViewPage() {
  return (
    <Suspense fallback={<DocumentViewerLoading />}>
      <DocumentViewContent />
    </Suspense>
  );
}
