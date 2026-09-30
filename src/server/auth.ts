"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from "@/lib/session";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET chưa được cấu hình (xem .env.example)");
  }
  return secret;
}

/** Đọc session hiện tại từ cookie. Trả về null nếu chưa đăng nhập / token không hợp lệ. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token, sessionSecret());
}

/** Dùng ở đầu các trang trong (dashboard): bắt buộc phải đăng nhập. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export type LoginState = { error?: string };

/**
 * Server Action cho form đăng nhập.
 * Chỉ có 2 tài khoản nội bộ, tạo bằng `scripts/create-user.ts`
 * (xem Implementation Plan, Giai đoạn 0) — không có đăng ký.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const token = await createSessionToken(
    {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      issuedAt: Date.now(),
    },
    sessionSecret()
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}