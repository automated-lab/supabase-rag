"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface DocumentViewerProps {
  url: string;
  fileName: string;
  fileType: string;
}

export function DocumentViewer({
  url,
  fileName,
  fileType,
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the URL is valid when the component mounts
    const checkUrl = async () => {
      try {
        console.log("Checking document URL:", url);

        // Skip the check for relative URLs (they're handled by our API)
        if (url.startsWith("/api/")) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok) {
          setError(`Failed to load document: ${response.statusText}`);
          console.error(
            `Document URL check failed: ${response.status} ${response.statusText}`
          );
        }
      } catch (err) {
        console.error("Error checking document URL:", err);
        setError(
          "Failed to load document. The file may not exist or is inaccessible."
        );
      } finally {
        setIsLoading(false);
      }
    };

    checkUrl();
  }, [url]);

  const renderViewer = () => {
    if (isLoading) {
      return <div className="p-8 text-center">Loading document...</div>;
    }

    if (error) {
      return (
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading document</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="mt-4 text-center">
            <p className="mb-4">
              The document could not be loaded. This may be because:
            </p>
            <ul className="list-disc text-left ml-8 mb-4">
              <li>The document was not properly uploaded</li>
              <li>The document storage is not accessible</li>
              <li>The Supabase Edge Function is not deployed</li>
            </ul>
            <p>
              Try uploading the document again or check your Supabase
              configuration.
            </p>
          </div>
        </div>
      );
    }

    switch (fileType.toLowerCase()) {
      case "pdf":
        return (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-[600px] border-0"
            title={fileName}
            onError={() => setError("Failed to load PDF document")}
          />
        );
      case "docx":
      case "doc":
      case "xlsx":
      case "xls":
      case "csv":
        // For Office documents, provide a download link
        return (
          <div className="p-8 text-center">
            <p className="mb-4">
              {fileType.toUpperCase()} files cannot be previewed directly.
              Please download the file to view it.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <a href={url} download={fileName}>
                  <Download className="mr-2 h-4 w-4" />
                  Download {fileName}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          </div>
        );
      case "txt":
      case "md":
      case "html":
        // For text files, fetch and display the content
        return (
          <iframe
            src={url}
            className="w-full h-[600px] border-0"
            title={fileName}
            onError={() => setError("Failed to load text document")}
          />
        );
      default:
        return (
          <div className="p-8 text-center">
            <p className="mb-4">
              This file type ({fileType}) cannot be previewed. Please download
              the file to view it.
            </p>
            <Button asChild>
              <a href={url} download={fileName}>
                <Download className="mr-2 h-4 w-4" />
                Download {fileName}
              </a>
            </Button>
          </div>
        );
    }
  };

  return <Card className="overflow-hidden">{renderViewer()}</Card>;
}
