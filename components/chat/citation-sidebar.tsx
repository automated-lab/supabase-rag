"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Table,
  AlertCircle,
} from "lucide-react";
import { getDocumentById } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";

/**
 * Utility functions for text formatting and display
 */

/**
 * Basic text normalization for when we only have a citation snippet
 * and not the original text
 */
const normalizeText = (text: string): string => {
  if (!text) return "";

  // Basic whitespace and punctuation fixes
  let normalized = text
    .replace(/\s+/g, " ")
    .trim()
    // Fix spacing around punctuation
    .replace(/(\w)([,.!?:;])(\w)/g, "$1$2 $3")
    .replace(/\s+([,.!?:;])/g, "$1")
    .replace(/([,.!?:;])\s+/g, "$1 ")
    // Fix spacing around brackets
    .replace(/\[\s*([^\]]+)\s*\]/g, "[$1]")
    .replace(/\s*\[\s*([^\]]+)\s*\]\s*/g, " [$1] ")
    // Fix camelCase spacing
    .replace(/([a-z])([A-Z])/g, "$1 $2");

  // Capitalize first letter of sentences
  normalized = normalized.replace(/^([a-z])/, (match, letter) =>
    letter.toUpperCase()
  );
  normalized = normalized.replace(
    /([.!?]\s+)([a-z])/g,
    (match, p1, p2) => p1 + p2.toUpperCase()
  );

  return normalized;
};

type Citation = {
  id: string;
  text: string;
  document: string;
  documentId?: string;
  // Additional fields that might be available
  startLine?: number;
  endLine?: number;
  pageNumber?: number;
  originalText?: string;
};

interface CitationSidebarProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationSidebar({ citation, onClose }: CitationSidebarProps) {
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedText, setFormattedText] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (citation) {
      if (citation.documentId) {
        fetchDocument(citation.documentId);
      }
      // Use the text directly since we now ensure it's the original text
      setFormattedText(citation.text || "");
    } else {
      setDocument(null);
      setFormattedText("");
    }
  }, [citation]);

  const fetchDocument = async (documentId: string) => {
    if (!documentId) {
      // If no document ID, just normalize the citation text as fallback
      if (citation?.text) {
        setFormattedText(normalizeText(citation.text));
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const doc = await getDocumentById(documentId);
      setDocument(doc);

      // If the document is available and the citation has start/end lines,
      // extract the exact text from the document
      if (doc && doc.content && citation?.startLine && citation?.endLine) {
        try {
          const lines = doc.content.split("\n");
          const startLine = Math.max(0, citation.startLine - 1);
          const endLine = Math.min(lines.length - 1, citation.endLine - 1);
          const extractedText = lines.slice(startLine, endLine + 1).join("\n");
          setFormattedText(extractedText);
        } catch (err) {
          console.error("Error extracting text from document:", err);
          // Fall back to basic normalization
          setFormattedText(normalizeText(citation?.text || ""));
        }
      } else {
        // No line information available, fall back to normalizing the citation text
        setFormattedText(normalizeText(citation?.text || ""));
      }
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Failed to load document details");
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive",
      });

      // Still try to show normalized text
      if (citation?.text) {
        setFormattedText(normalizeText(citation.text));
      }
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = () => {
    const type = document?.metadata?.type;

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

  if (!citation) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">
          Citation Details
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 px-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Cited Text
              </h3>
              <div className="p-4 bg-muted/50 rounded-md text-sm">
                {formattedText}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      {document && (
        <CardFooter className="border-t pt-4 flex flex-col gap-4">
          <div className="w-full">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Source Document
            </h3>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : error ? (
              <div className="p-4 bg-destructive/10 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>{error}</span>
              </div>
            ) : document ? (
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getDocumentIcon()}
                    <div className="font-medium text-base">
                      {document.title}
                    </div>
                    {document.metadata?.type && (
                      <Badge variant="secondary" className="ml-auto">
                        {document.metadata.type.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {document.metadata?.fileName && (
                    <div className="text-sm text-muted-foreground">
                      {document.metadata.fileName}
                      {document.metadata.size &&
                        ` (${(document.metadata.size / 1024).toFixed(1)} KB)`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-4 bg-muted/50 rounded-md text-sm">
                No document information available
              </div>
            )}
          </div>

          {document && document.signedUrl && (
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1 mr-2"
              >
                <a
                  href={document.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Document
                </a>
              </Button>

              <Button variant="default" size="sm" asChild className="flex-1">
                <a
                  href={document.signedUrl}
                  download={document.metadata?.fileName || "document"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
