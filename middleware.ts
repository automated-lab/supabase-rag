import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { corsHeaders, handleCors } from "./lib/cors";

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (
    request.method === "OPTIONS" &&
    request.nextUrl.pathname.startsWith("/api")
  ) {
    return handleCors(request);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();

  // If the user is not signed in and the route is protected, redirect to login
  if (!data.session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If the user is signed in and trying to access auth pages, redirect to documents
  if (data.session && isAuthRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/documents", request.url));
  }

  const { pathname } = request.nextUrl;

  // Check if this is a document page with an ID
  if (
    pathname.startsWith("/documents/") &&
    !pathname.includes(".") &&
    !pathname.includes("/view") &&
    pathname.split("/").length === 3
  ) {
    // Extract the ID from the path
    const id = pathname.split("/")[2];

    // Create a new URL with the ID as a search parameter
    const url = request.nextUrl.clone();
    url.pathname = "/documents/view";
    url.searchParams.set("id", id);

    return NextResponse.redirect(url);
  }

  // Add CORS headers to API responses
  if (pathname.startsWith("/api")) {
    // Apply CORS headers to the response
    const origin = request.headers.get("origin") || "";
    response.headers.set("Access-Control-Allow-Origin", origin);
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
  }

  return response;
}

// Define which routes are protected (require authentication)
function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = ["/documents", "/chat"];
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

// Define which routes are auth routes (login, signup, etc.)
function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/auth") && pathname !== "/auth/callback";
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - documents/view path
     */
    "/((?!_next/static|_next/image|favicon.ico|documents/view|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
