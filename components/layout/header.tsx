"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Database, MessageSquare, Settings } from "lucide-react";
import { AuthButton } from "@/components/auth/auth-button";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const supabase = createClient();

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Check admin status
        const { data } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setIsAdmin(data?.is_admin || false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, []);

  return (
    <header className="border-b">
      <div className="px-6 flex h-16 items-center">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Database className="h-5 w-5" />
            <span>AI KnowledgeBase</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/documents">Documents</Link>
          </Button>
          {!isLoading && isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <AuthButton />
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
