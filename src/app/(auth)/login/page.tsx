"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { login, type LoginState } from "@/server/auth";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent px-4 py-2 text-paper transition disabled:opacity-60"
    >
      {pending ? "Đang đăng nhập..." : "Đăng nhập"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">ABMS</h1>
        <p className="mb-6 text-sm text-ink/60">Đăng nhập bằng tài khoản nội bộ.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
