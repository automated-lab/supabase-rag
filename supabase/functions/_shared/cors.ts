// Define Deno namespace for TypeScript
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
}

// Define allowed origins based on environment
const allowedOrigins = [
  "http://localhost:3000", // For local development
  Deno.env.get("NEXT_PUBLIC_SITE_URL"), // Production URL from environment variable
  "https://supabase-k94ctk4go-automated-one.vercel.app", // Add the specific Vercel domain
  // Add any other origins you want to allow
].filter(Boolean); // Remove any undefined/null values

// Log the allowed origins for debugging
console.log("Supabase Edge Function CORS Allowed Origins:", allowedOrigins);

// CORS headers to apply
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // This will be overridden in the function
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, x-supabase-client",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(response: Response, request: Request) {
  const origin = request.headers.get("origin") || "";
  console.log("Supabase Edge Function Request origin:", origin);

  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes("*") ||
    origin.endsWith(".vercel.app");

  const allowedOrigin = isAllowedOrigin ? origin : allowedOrigins[0] || "*";

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    corsHeaders["Access-Control-Allow-Methods"]
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    corsHeaders["Access-Control-Allow-Headers"]
  );
  response.headers.set(
    "Access-Control-Allow-Credentials",
    corsHeaders["Access-Control-Allow-Credentials"]
  );
  response.headers.set(
    "Access-Control-Max-Age",
    corsHeaders["Access-Control-Max-Age"]
  );

  return response;
}
