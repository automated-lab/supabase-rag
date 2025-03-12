"use client";

import * as React from "react";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { SuggestedPrompts } from "./suggested-prompts";
import { CitationSidebar } from "./citation-sidebar";
import { generateChatResponse } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Citation = {
  id: string;
  text: string;
  document: string;
  documentId?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: Message[];
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "welcome-message",
            role: "assistant",
            content:
              "Hello! I'm your document assistant. Ask me anything about your uploaded documents.",
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport=""]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    // Scroll to bottom on initial load
    setTimeout(scrollToBottom, 100);
  }, []);

  // Add this effect to scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Close the citation sidebar when sending a new message
    setActiveCitation(null);
    setSidebarOpen(false);

    // Check if this is the first user message
    const isFirstUserMessage =
      messages.filter((msg) => msg.role === "user").length === 0 &&
      initialMessages.length === 0;

    // If this is the first user message, refresh the page after a short delay
    // to show the updated title that will be generated server-side
    if (isFirstUserMessage) {
      setTimeout(() => {
        console.log("Refreshing page after first user message");
        router.refresh();
      }, 500);
    }

    try {
      const response = await generateChatResponse(
        input,
        conversationId,
        messages
      );

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.content,
          citations: response.citations as any,
        },
      ]);

      // The title generation is already handled in the generateChatResponse function
      // No need to call it here

      setTimeout(scrollToBottom, 100);

      // Add a delay before refreshing to ensure the title update has time to propagate
      setTimeout(() => {
        console.log("Refreshing page to show updated title");
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error("Error generating response:", error);
      toast({
        title: "Error",
        description: "Failed to generate a response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
    // Focus the input field
    const inputElement = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setActiveCitation(null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div
        className={cn(
          "flex flex-1 gap-4 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "mr-[2200px] md:mr-0" : ""
        )}
      >
        <Card className="flex flex-col flex-grow overflow-hidden">
          <ScrollArea
            ref={scrollAreaRef}
            className="flex-1 p-4 overflow-auto"
            style={{ height: "calc(100% - 260px)" }}
          >
            <div className="space-y-4 pb-8">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                  activeCitationId={activeCitation?.id}
                />
              ))}
              {isLoading && (
                <ChatMessage
                  message={{
                    id: "loading",
                    role: "assistant",
                    content: "Thinking...",
                  }}
                  isLoading
                />
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-4 flex-shrink-0 overflow-hidden">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Ask a question about your documents..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
          <div className="flex-shrink-0 border-t overflow-hidden">
            <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
          </div>
        </Card>

        {/* Citation Sidebar - Fixed position on mobile, side-by-side on desktop */}
        <div
          className={cn(
            "fixed top-0 right-0 bottom-0 z-20 w-[2200px] bg-background border-border transition-transform duration-300 overflow-hidden",
            "md:static md:w-[2200px] md:transform-none",
            sidebarOpen ? "translate-x-0" : "translate-x-full md:w-0"
          )}
        >
          {activeCitation && (
            <CitationSidebar citation={activeCitation} onClose={closeSidebar} />
          )}
        </div>
      </div>
    </div>
  );
}
