import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, MessageSquare, Upload } from "lucide-react";
import Image from "next/image";
import { ThemeLogos } from "../components/theme/theme-logos";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12 text-center bg-gradient-to-b from-background to-muted/30">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Knowledge<span className="text-primary">Base</span>
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-md mx-auto">
          A RAG system powered by Next.js, Supabase Vector, and OpenAI
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button asChild size="lg">
            <Link href="/chat">
              <MessageSquare className="mr-2 h-5 w-5" />
              Chat with your documents
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/documents">
              <Upload className="mr-2 h-5 w-5" />
              Manage documents
            </Link>
          </Button>
        </div>

        {/* Logos Section */}
        <div className="mt-12">
          <ThemeLogos />
        </div>
      </div>

      <div className="container py-12 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
            <Database className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold">Vector Database</h3>
            <p className="text-muted-foreground mt-2">
              Store and query document embeddings using Supabase pgvector
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
            <Upload className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold">Document Management</h3>
            <p className="text-muted-foreground mt-2">
              Upload, view, and delete documents in your knowledge base
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
            <MessageSquare className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold">Chat Interface</h3>
            <p className="text-muted-foreground mt-2">
              Interact with your documents through a conversational interface
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
