import { notFound } from "next/navigation";
import { getConversationMessages, getConversations } from "@/lib/actions";
import { ChatLayout } from "@/components/chat/chat-layout";
import type { Metadata } from "next";

// Add cache control to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: ChatPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const conversations = await getConversations();
    const conversation = conversations.find((c) => c.id === id);

    if (!conversation) {
      return {
        title: "Chat",
      };
    }

    return {
      title: conversation.title,
    };
  } catch (error) {
    return {
      title: "Chat",
    };
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  try {
    // Get all conversations for the sidebar
    const conversations = await getConversations();

    // Check if the requested conversation exists
    const currentConversation = conversations.find((c) => c.id === id);
    if (!currentConversation) {
      return notFound();
    }

    // Get messages for the current conversation
    const rawMessages = await getConversationMessages(id);

    // Map the messages to ensure they match the expected format
    // This ensures only 'user' and 'assistant' roles are included
    const messages = rawMessages.map((msg) => ({
      id: msg.id,
      role:
        msg.role === "system"
          ? "assistant"
          : msg.role === "user" || msg.role === "assistant"
          ? msg.role
          : "assistant",
      content: msg.content,
      citations: msg.citations,
    }));

    return (
      <ChatLayout
        conversations={conversations}
        currentConversationId={id}
        initialMessages={messages}
      />
    );
  } catch (error) {
    return notFound();
  }
}
