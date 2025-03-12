import { redirect } from "next/navigation"
import { createConversation, getConversations } from "@/lib/actions"

export default async function ChatPage() {
  // Get all conversations
  let conversations
  try {
    conversations = await getConversations()
  } catch (error) {
    // If there's an error (like user not authenticated), redirect to login
    return redirect("/auth/login")
  }

  // If there are no conversations, create a new one and redirect to it
  if (!conversations || conversations.length === 0) {
    const conversationId = await createConversation()
    return redirect(`/chat/${conversationId}`)
  }

  // Otherwise, redirect to the most recent conversation
  return redirect(`/chat/${conversations[0].id}`)
}

