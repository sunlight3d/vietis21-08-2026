import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Paths that don't require authentication
  const isPublicPath = path === "/login" || path === "/register";
  
  // Skip middleware for API routes except /api/tasks (which we want to protect)
  if (path.startsWith("/api/auth") || path.startsWith("/api/chat")) {
    return NextResponse.next();
  }

  // Get the session cookie
  const cookie = request.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie) : null;

  // Redirect to login if accessing a protected route without session
  if (!isPublicPath && !session && !path.startsWith('/_next') && !path.match(/\.(.*)$/)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to home if accessing login/register with active session
  if (isPublicPath && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
