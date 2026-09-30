import type { ReactNode } from "react";

/** Query string `?notice=...&error=...` do Server Action gắn vào khi chuyển trang. */
export type FlashSearchParams = { notice?: string; error?: string };

const TONE_CLASSES = {
  success: "bg-green-50 text-green-800",
  error: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-900",
} as const;

export function Alert({
  tone,
  children,
}: {
  tone: keyof typeof TONE_CLASSES;
  children: ReactNode;
}) {
  return (
    <p className={`rounded p-3 text-sm ${TONE_CLASSES[tone]}`}>{children}</p>
  );
}

/** Hiển thị thông báo thành công / lỗi sau khi gửi form. */
export function FlashMessages({ notice, error }: FlashSearchParams) {
  return (
    <>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
    </>
  );
}
