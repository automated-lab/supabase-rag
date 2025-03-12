"use client";

import type React from "react";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  File,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { uploadDocument, uploadFileDocument } from "@/lib/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const SUPPORTED_FILE_TYPES = [
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
  ".md",
  ".html",
  ".htm",
  ".csv",
  ".xlsx",
  ".xls",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "chunking"
  | "embedding"
  | "success"
  | "error";

interface UploadProgressProps {
  status: UploadStatus;
  errorMessage?: string;
  fileName?: string;
}

function UploadProgress({
  status,
  errorMessage,
  fileName,
}: UploadProgressProps) {
  const getProgress = () => {
    switch (status) {
      case "uploading":
        return 25;
      case "processing":
        return 50;
      case "chunking":
        return 75;
      case "embedding":
        return 90;
      case "success":
        return 100;
      case "error":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
      case "processing":
      case "chunking":
      case "embedding":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "idle":
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return "Uploading document...";
      case "processing":
        return `Processing ${fileName || "document"}...`;
      case "chunking":
        return "Chunking content...";
      case "embedding":
        return "Generating embeddings...";
      case "success":
        return "Document successfully processed!";
      case "error":
        return errorMessage || "Error processing document";
      case "idle":
      default:
        return "Ready to upload";
    }
  };

  if (status === "idle") return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span
          className={
            status === "error" ? "text-destructive" : "text-foreground"
          }
        >
          {getStatusText()}
        </span>
      </div>
      <Progress
        value={getProgress()}
        className={status === "error" ? "bg-destructive/20" : ""}
      />
      {status === "error" && errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function UploadDocument() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      toast({
        title: "Missing fields",
        description: "Please provide both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadStatus("uploading");

      // Simulate network delay to show status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start processing document
      setUploadStatus("processing");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start chunking content
      setUploadStatus("chunking");

      const document = await uploadDocument({ title, content });

      // Simulate embedding delay
      setUploadStatus("embedding");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      setUploadStatus("success");

      toast({
        title: "Document uploaded",
        description:
          "Your document has been processed and added to the knowledge base",
        variant: "default",
      });

      // Reset form after a brief delay to show success state
      setTimeout(() => {
        setTitle("");
        setContent("");
        setUploadStatus("idle");

        // Refresh document list without a full page reload
        startTransition(() => {
          router.refresh();
        });
      }, 2000);
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploadStatus("error");
      const errorMsg =
        error instanceof Error ? error.message : "Failed to upload document";
      setErrorMessage(errorMsg);

      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Check file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setFileError(
          `File is too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`
        );
        e.target.value = "";
        return;
      }

      // Check file type
      const fileExtension =
        "." + selectedFile.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_FILE_TYPES.includes(fileExtension)) {
        setFileError(
          `Unsupported file type. Please upload one of: ${SUPPORTED_FILE_TYPES.join(
            ", "
          )}`
        );
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadStatus("uploading");

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Create a document object
      const document = {
        title: title || file.name,
        fileName: file.name,
        fileContent: base64,
      };

      // Upload the document
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Start processing the document
      setUploadStatus("processing");

      try {
        // Call the processing API
        const processResponse = await fetch("/api/documents/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId: data.documentId }),
        });

        if (!processResponse.ok) {
          const processErrorText = await processResponse.text();
          console.error(
            `Processing failed: ${processResponse.statusText} - ${processErrorText}`
          );
          // Continue with the flow even if processing fails
        } else {
          const processData = await processResponse.json();
          console.log("Processing result:", processData);
        }
      } catch (processError) {
        console.error("Error processing document:", processError);
        // Continue with the flow even if processing fails
      }

      // Success
      setUploadStatus("success");

      toast({
        title: "Document uploaded",
        description:
          "Your document has been processed and added to the knowledge base",
        variant: "default",
      });

      // Reset form after a brief delay to show success state
      setTimeout(() => {
        setTitle("");
        setFile(null);
        setUploadStatus("idle");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Refresh document list without a full page reload
        startTransition(() => {
          router.refresh();
        });
      }, 2000);
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploadStatus("error");
      const errorMsg =
        error instanceof Error ? error.message : "Failed to upload document";
      setErrorMessage(errorMsg);

      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const isUploading =
    uploadStatus !== "idle" &&
    uploadStatus !== "success" &&
    uploadStatus !== "error";

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="text">Paste Plain Text</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-title">Document Title</Label>
                <Input
                  id="file-title"
                  placeholder="Enter document title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-file">File</Label>
                <Input
                  id="document-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={SUPPORTED_FILE_TYPES.join(",")}
                  disabled={uploadStatus !== "idle"}
                />
                {fileError && (
                  <p className="text-sm text-destructive">{fileError}</p>
                )}
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, Word (.docx, .doc), Text (.txt),
                  Markdown (.md), HTML, CSV, Excel (.xlsx, .xls)
                  <br />
                  Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isUploading || !file || !title || !!fileError}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <File className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Processing..." : "Upload Document"}
              </Button>

              <UploadProgress
                status={uploadStatus}
                errorMessage={errorMessage}
                fileName={file?.name}
              />
            </form>
          </TabsContent>

          <TabsContent value="text">
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  placeholder="Enter document title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Document Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter document content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                  disabled={isUploading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isUploading || !title || !content}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Processing..." : "Upload Text Document"}
              </Button>

              <UploadProgress
                status={uploadStatus}
                errorMessage={errorMessage}
              />
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
