import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// Middleware chạy trên Edge runtime, nên chỉ dùng verifySessionToken
// (Web Crypto API) — KHÔNG import bcrypt hay Prisma Client ở đây.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET ?? "";

  const session = token && secret ? await verifySessionToken(token, secret) : null;

  const isLoginPage = pathname.startsWith("/login");

  if (!session && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Áp dụng cho mọi route trừ static assets và API nội bộ của Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
