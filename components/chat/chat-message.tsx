"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";

type Citation = {
  id: string;
  text: string;
  document: string;
  documentId?: string;
  startLine?: number;
  endLine?: number;
  originalText?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
  onCitationClick?: (citation: Citation) => void;
  activeCitationId?: string;
}

export function ChatMessage({
  message,
  isLoading = false,
  onCitationClick,
  activeCitationId,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  // Process the message content to replace citation badges with proper format
  let processedContent = message.content;

  // Track which citations are actually referenced in the message
  const referencedCitationIndices = new Set<number>();

  // Only process citations for assistant messages
  if (!isUser && !isLoading) {
    // Find all CITATION_BADGE_X patterns and track them
    const citationBadgePattern = /CITATION_BADGE_(\d+)/g;
    let match;
    const contentWithBadges = processedContent;

    while ((match = citationBadgePattern.exec(contentWithBadges)) !== null) {
      const index = parseInt(match[1]);
      if (message.citations && index >= 0 && index < message.citations.length) {
        referencedCitationIndices.add(index);
      }
    }

    // Also check for any CITATION_BADGE without numbers
    if (
      processedContent.includes("CITATION_BADGE") &&
      message.citations &&
      message.citations.length > 0
    ) {
      referencedCitationIndices.add(0); // Add the first citation
    }

    // Replace all CITATION_BADGE_X with [X+1]
    processedContent = processedContent.replace(
      /CITATION_BADGE_(\d+)/g,
      (match, index) => {
        const citationIndex = parseInt(index);
        return `[${citationIndex + 1}]`;
      }
    );

    // Also replace any CITATION_BADGE without numbers
    processedContent = processedContent.replace(/CITATION_BADGE/g, "[1]");
  }

  // Function to replace citation references with badges
  const processContent = (content: string) => {
    if (!message.citations || message.citations.length === 0) {
      return content;
    }

    // Create a regex pattern to match citation references like [1], [2], etc.
    const citationPattern = /\[(\d+)\]/g;

    // Replace citation references with custom markers for splitting
    const markedContent = content.replace(citationPattern, (match, number) => {
      const index = Number.parseInt(number) - 1;
      if (index >= 0 && index < message.citations!.length) {
        return `__CITATION_${index}__`;
      }
      return match;
    });

    // Split by citation markers and create an array of content and citations
    const parts = markedContent.split(/__CITATION_(\d+)__/);

    if (parts.length === 1) {
      return content; // No citations found or replaced
    }

    // Process the parts array to render text and citation badges
    return parts
      .map((part, i) => {
        // Even indices are text content
        if (i % 2 === 0) {
          return part;
        }

        // Odd indices are citation indices
        const citationIndex = Number.parseInt(part);
        return `__CITATION_BADGE_${citationIndex}__`;
      })
      .join("");
  };

  // Custom renderer for ReactMarkdown to handle citation badges
  const customRenderers = {
    // @ts-ignore
    p: ({ node, ...props }) => {
      const children = props.children;

      if (typeof children !== "string") {
        return <p className="mb-4" {...props} />;
      }

      // Check for any remaining CITATION_BADGE patterns and replace them
      if (children.includes("CITATION_BADGE_")) {
        const directReplaced = children.replace(
          /CITATION_BADGE_(\d+)/g,
          (match, index) => {
            const citationIndex = parseInt(index);
            return `[${citationIndex + 1}]`;
          }
        );
        return <p className="mb-4">{directReplaced}</p>;
      }

      // Check for citation badge patterns
      const hasCitationBadge = children.includes("__CITATION_BADGE_");

      if (!hasCitationBadge) {
        return <p className="mb-4" {...props} />;
      }

      // First handle the __CITATION_BADGE_ format
      let processedContent = children;

      // Then handle the CITATION_BADGE_ format (without underscores)
      const citationBadgePattern = /CITATION_BADGE_(\d+)/g;
      const citationMatches = [
        ...processedContent.matchAll(citationBadgePattern),
      ];

      if (citationMatches.length > 0) {
        // Replace CITATION_BADGE_X with __CITATION_BADGE_X__ for consistent processing
        processedContent = processedContent.replace(
          citationBadgePattern,
          (match, index) => `__CITATION_BADGE_${index}__`
        );
      }

      // Split by citation badge markers
      const parts = processedContent.split(/__CITATION_BADGE_(\d+)__/);

      return (
        <p className="mb-4">
          {parts.map((part, i) => {
            // Even indices are text content
            if (i % 2 === 0) {
              return part;
            }

            // Odd indices are citation indices
            const citationIndex = Number.parseInt(part);
            // Handle index out of bounds
            if (
              citationIndex < 0 ||
              citationIndex >= (message.citations?.length || 0)
            ) {
              return `[${citationIndex + 1}]`;
            }

            const citation = message.citations![citationIndex];

            return (
              <Badge
                key={`citation-${citationIndex}`}
                variant="outline"
                className={cn(
                  "ml-1 mr-1 cursor-pointer hover:bg-primary/10 transition-colors",
                  activeCitationId === citation.id &&
                    "bg-primary/20 border-primary"
                )}
                onClick={() => onCitationClick && onCitationClick(citation)}
              >
                <FileText className="h-3 w-3 mr-1" />
                {citationIndex + 1}
              </Badge>
            );
          })}
        </p>
      );
    },
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-3",
        isUser ? "bg-muted/50" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border",
          isUser ? "bg-background" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className={cn("space-y-2", isLoading && "animate-pulse")}>
          {isLoading ? (
            message.content
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1
                      className="text-2xl font-semibold mt-6 mb-4"
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-xl font-semibold mt-5 mb-3"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-lg font-semibold mt-4 mb-2"
                      {...props}
                    />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4
                      className="text-base font-semibold mt-3 mb-1"
                      {...props}
                    />
                  ),
                  // @ts-ignore
                  p: customRenderers.p,
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-4" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="mb-1" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-primary underline hover:text-primary/80"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-muted pl-4 italic my-4"
                      {...props}
                    />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-6 border-muted" {...props} />
                  ),
                  img: ({ node, alt, src, ...props }) => (
                    <img
                      src={src || "/placeholder.svg"}
                      alt={alt}
                      className="max-w-full h-auto rounded-md my-4"
                      {...props}
                    />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-muted/50" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="border border-border px-4 py-2 text-left font-semibold"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-border px-4 py-2" {...props} />
                  ),
                  // @ts-ignore
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      // @ts-ignore
                      <SyntaxHighlighter
                        style={isDarkTheme ? oneDark : oneLight}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-4"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className={cn(
                          "rounded-sm bg-muted px-1 py-0.5 font-mono text-sm",
                          inline ? "inline" : "block p-4 my-4"
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {processedContent}
              </ReactMarkdown>

              {/* Only show Sources section if there are referenced citations */}
              {!isUser &&
                message.citations &&
                message.citations.length > 0 &&
                referencedCitationIndices.size > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(referencedCitationIndices).map((index) => {
                        const citation = message.citations![index];
                        return (
                          <Badge
                            key={`source-${index}`}
                            variant="secondary"
                            className={cn(
                              "cursor-pointer hover:bg-primary/10 transition-colors",
                              activeCitationId === citation.id &&
                                "bg-primary/20 border-primary"
                            )}
                            onClick={() =>
                              onCitationClick && onCitationClick(citation)
                            }
                          >
                            {index + 1}. {citation.document}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
