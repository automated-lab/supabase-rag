"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the view page
    router.replace(`/documents/view?id=${params.id}`);
  }, [params.id, router]);

  return <div className="container py-8 text-center">Redirecting...</div>;
}
