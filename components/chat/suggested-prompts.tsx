"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSuggestedPrompts } from "@/lib/actions";

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const suggestions = await generateSuggestedPrompts();
        setPrompts(suggestions);
      } catch (error) {
        console.error("Error fetching suggested prompts:", error);
        // Fallback prompts if generation fails
        setPrompts([
          "Can you summarize the key points from my documents?",
          "What are the main topics covered in my uploaded files?",
          "Compare and contrast the information across my documents.",
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Set CSS variable for height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--suggested-prompts-height",
          `${height}px`
        );
      }
    };

    // Update on mount, when loading changes, and when prompts change
    updateHeight();

    // Also update after a short delay to ensure all content is rendered
    const timeoutId = setTimeout(updateHeight, 100);

    // Add resize listener
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      clearTimeout(timeoutId);
    };
  }, [loading, prompts]);

  if (loading) {
    return (
      <div ref={containerRef} className="flex flex-col space-y-2 p-4">
        <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Generating suggested questions...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="p-3 h-24 flex items-center justify-center animate-pulse bg-muted/50"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return <div ref={containerRef} className="h-0"></div>;
  }

  return (
    <div ref={containerRef} className="flex flex-col space-y-2 p-4">
      <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Suggested questions based on your documents</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {prompts.slice(0, 3).map((prompt, index) => (
          <Card
            key={index}
            className={cn(
              "p-3 border border-border hover:border-primary/50 hover:bg-accent transition-colors cursor-pointer",
              "flex items-center text-sm"
            )}
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </Card>
        ))}
      </div>
    </div>
  );
}
