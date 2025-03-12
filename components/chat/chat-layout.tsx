"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { createConversation } from "@/lib/actions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: {
    id: string;
    text: string;
    document: string;
  }[];
  created_at?: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

interface ChatLayoutProps {
  conversations: Conversation[];
  currentConversationId: string;
  initialMessages: Message[];
}

export function ChatLayout({
  conversations,
  currentConversationId,
  initialMessages,
}: ChatLayoutProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewConversation = async () => {
    const newConversationId = await createConversation();
    router.push(`/chat/${newConversationId}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden pb-4 pt-2">
      <div className="flex h-[calc(100%-0.5rem)] max-h-[calc(100%-0.5rem)] overflow-hidden">
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <div className="flex items-center mb-4 px-6">
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-4">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
              <h1 className="text-3xl font-semibold tracking-tight">Chat</h1>
            </div>
            <SheetContent side="left" className="p-0 w-[280px] pb-2">
              <ConversationSidebar
                key={`sidebar-mobile-${conversations
                  .map((c) => `${c.id}-${c.title}`)
                  .join("-")}`}
                conversations={conversations}
                currentConversationId={currentConversationId}
                onNewConversation={handleNewConversation}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <div className="w-[320px] shrink-0 overflow-hidden pb-2">
            <ConversationSidebar
              key={`sidebar-${conversations
                .map((c) => `${c.id}-${c.title}`)
                .join("-")}`}
              conversations={conversations}
              currentConversationId={currentConversationId}
              onNewConversation={handleNewConversation}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden px-6">
          {!isMobile && (
            <div className="mb-1 flex-shrink-0">
              <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
              <p className="text-muted-foreground text-xs">
                Ask questions about your documents
              </p>
            </div>
          )}
          <ChatInterface
            conversationId={currentConversationId}
            initialMessages={initialMessages as any}
          />
        </div>
      </div>
    </div>
  );
}
