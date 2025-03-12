import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define allowed origins based on environment
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ([
        process.env.NEXT_PUBLIC_SITE_URL, // Use env variable
        "https://supabase-k94ctk4go-automated-one.vercel.app", // Add the specific Vercel domain
      ].filter(Boolean) as string[]) // Remove undefined values
    : ["http://localhost:3000"];

// Log the allowed origins for debugging
console.log("CORS Allowed Origins:", allowedOrigins);

// CORS headers to apply
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // This will be overridden in the middleware
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, x-supabase-client",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: NextRequest) {
  // Get the origin from the request headers
  const origin = req.headers.get("origin") || "";
  console.log("Request origin:", origin);

  // Check if the origin is allowed
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes("*") ||
    origin.endsWith(".vercel.app");

  // Create a response with appropriate CORS headers
  const response = new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin": isAllowedOrigin
        ? origin
        : allowedOrigins[0] || "*",
    },
  });

  return response;
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(response: NextResponse, req: NextRequest) {
  const origin = req.headers.get("origin") || "";
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
