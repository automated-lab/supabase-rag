"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertCircle,
  FileText,
  Trash2,
  File,
  FileSpreadsheet,
  FileCode,
  Table,
  RefreshCw,
  Loader2,
  Eye,
} from "lucide-react";
import { deleteDocument, getDocuments } from "@/lib/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";

type Document = {
  id: string;
  title: string;
  created_at: string;
  metadata?: {
    type?: string;
    fileName?: string;
    size?: number;
    pageCount?: number;
    processingStatus?: string;
    processingProgress?: number;
    processingError?: string;
  };
};

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { isAdmin } = useAdmin();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
      setError(null);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Set up polling for document list refreshes
    const intervalId = setInterval(() => {
      startTransition(() => {
        fetchDocuments();
      });
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteDocument(id);

      // Filter out the deleted document from the state
      setDocuments(documents.filter((doc) => doc.id !== id));

      toast({
        title: "Document deleted",
        description: "The document has been removed from your knowledge base",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the document",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
      fetchDocuments();
    });
  };

  const getDocumentIcon = (doc: Document) => {
    const type = doc.metadata?.type;

    switch (type) {
      case "pdf":
        return <File className="h-5 w-5 text-red-500" />;
      case "docx":
      case "doc":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "txt":
        return <FileText className="h-5 w-5 text-gray-500" />;
      case "md":
        return <FileCode className="h-5 w-5 text-purple-500" />;
      case "html":
        return <FileCode className="h-5 w-5 text-orange-500" />;
      case "csv":
        return <Table className="h-5 w-5 text-green-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Check if the date is today
    if (date.toDateString() === now.toDateString()) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `Today at ${hours}:${minutes}`;
    }

    // Check if the date is yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Format as MM/DD/YYYY for older dates
    return date.toLocaleDateString();
  };

  if (loading && documents.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && documents.length === 0) {
    return (
      <Card className="bg-destructive/10">
        <CardContent className="pt-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Documents</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending || loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${
              isPending || loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No documents found</p>
            <p className="text-sm">Upload your first document to get started</p>
          </CardContent>
        </Card>
      ) : (
        documents.map((doc) => (
          <Card
            key={doc.id}
            className={deletingId === doc.id ? "opacity-60" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {getDocumentIcon(doc)}
                <CardTitle className="text-lg font-medium">
                  {doc.title}
                </CardTitle>
                {doc.metadata?.type && (
                  <Badge variant="secondary" className="ml-auto">
                    {doc.metadata.type.toUpperCase()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Added {formatDate(doc.created_at)}
                {doc.metadata?.fileName && (
                  <div className="text-xs mt-1">
                    {doc.metadata.fileName}
                    {doc.metadata.size &&
                      ` (${(doc.metadata.size / 1024).toFixed(1)} KB)`}
                  </div>
                )}
                {doc.metadata?.processingStatus &&
                  doc.metadata.processingStatus !== "complete" && (
                    <div className="mt-2">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {doc.metadata.processingStatus === "pending" &&
                          "Pending processing"}
                        {doc.metadata.processingStatus === "uploaded" &&
                          "Uploaded, waiting to process"}
                        {doc.metadata.processingStatus === "processing" &&
                          "Processing document"}
                        {doc.metadata.processingStatus === "chunking" &&
                          "Chunking content"}
                        {doc.metadata.processingStatus === "embedding" &&
                          "Generating embeddings"}
                        {doc.metadata.processingStatus.startsWith(
                          "processed"
                        ) && doc.metadata.processingStatus}
                        {doc.metadata.processingStatus === "error" &&
                          "Processing failed"}
                      </Badge>
                      {doc.metadata.processingProgress !== undefined &&
                        doc.metadata.processingProgress > 0 &&
                        doc.metadata.processingProgress < 100 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{
                                width: `${doc.metadata.processingProgress}%`,
                              }}
                            ></div>
                          </div>
                        )}
                      {doc.metadata.processingError && (
                        <div className="text-xs text-destructive mt-1">
                          Error: {doc.metadata.processingError}
                        </div>
                      )}
                    </div>
                  )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/documents/${doc.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this document? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doc.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {isPending && documents.length > 0 && (
        <div className="flex justify-center py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Updating document list...
        </div>
      )}
    </div>
  );
}
