"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

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
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok) {
          setError(`Failed to load document: ${response.statusText}`);
        }
      } catch (err) {
        setError("Failed to load document");
        console.error("Error checking document URL:", err);
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
      return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    switch (fileType.toLowerCase()) {
      case "pdf":
        return (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-[600px] border-0"
            title={fileName}
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
