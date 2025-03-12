"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

export function ThemeLogos() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show the UI when mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-wrap justify-center items-center gap-8 h-8"></div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-wrap justify-center items-center gap-8">
      <div className="h-8 relative flex items-center">
        {isDark ? (
          <Image
            src="/logos/OpenAI-white-wordmark.png"
            alt="OpenAI Logo"
            width={120}
            height={24}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logos/OpenAI-black-wordmark.png"
            alt="OpenAI Logo"
            width={120}
            height={24}
            className="object-contain"
          />
        )}
      </div>

      <div className="h-8 relative">
        {isDark ? (
          <Image
            src="/logos/supabase-logo-wordmark--dark.png"
            alt="Supabase Logo"
            width={144}
            height={30}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logos/supabase-logo-wordmark--light.png"
            alt="Supabase Logo"
            width={144}
            height={30}
            className="object-contain"
          />
        )}
      </div>

      <div className="h-8 relative">
        {isDark ? (
          <Image
            src="/logos/langchain-text-white.png"
            alt="LangChain Logo"
            width={130}
            height={28}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logos/langchain-text-black.png"
            alt="LangChain Logo"
            width={130}
            height={28}
            className="object-contain"
          />
        )}
      </div>
    </div>
  );
}
