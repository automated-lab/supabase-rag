"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { deleteConversation } from "@/lib/actions";
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
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onNewConversation,
}: ConversationSidebarProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await deleteConversation(id);

      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed",
      });

      // If we deleted the current conversation, navigate to the most recent one
      if (id === currentConversationId) {
        const remainingConversations = conversations.filter((c) => c.id !== id);
        if (remainingConversations.length > 0) {
          router.push(`/chat/${remainingConversations[0].id}`);
        } else {
          // If no conversations left, create a new one
          onNewConversation();
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the conversation",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // If the date is today
    if (date.toDateString() === now.toDateString()) {
      return "Today";
    }

    // If the date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Otherwise, return the date in a readable format
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col border rounded-lg mt-2 ml-2 mb-2">
      <div className="p-4">
        <Button
          onClick={onNewConversation}
          className="w-full justify-center"
          variant="default"
          size="default"
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="group relative">
              <Link
                href={`/chat/${conversation.id}`}
                className={cn(
                  "block w-full px-3 py-2 text-sm rounded-md border border-transparent h-[72px] flex flex-col justify-between",
                  "hover:bg-muted hover:border-border",
                  conversation.id === currentConversationId &&
                    "bg-muted border-border"
                )}
              >
                <div className="pr-6 h-full flex flex-col justify-between">
                  <div
                    className="font-semibold text-foreground overflow-hidden break-words line-clamp-2 whitespace-normal h-[40px]"
                    title={conversation.title}
                  >
                    {conversation.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(conversation.updated_at)}
                  </div>
                </div>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isDeleting === conversation.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete conversation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this conversation? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(conversation.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
