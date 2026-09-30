import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { toUserMessage } from "@/server/errors";

/**
 * Helper dùng chung cho các Server Action xử lý form.
 *
 * QUY TẮC QUAN TRỌNG: `redirect()` của Next.js hoạt động bằng cách NÉM một lỗi
 * đặc biệt (NEXT_REDIRECT). Vì vậy KHÔNG BAO GIỜ gọi `redirect()` bên trong
 * `try { ... } catch`, nếu không catch sẽ bắt luôn lỗi này và hiện ra thông báo
 * "NEXT_REDIRECT". Cách dùng đúng:
 *
 *   const result = await attempt(() => doWork());   // chỉ bọc phần có thể lỗi
 *   if (!result.ok) redirectWithError(path, result.message);
 *   redirectWithNotice(path, "Đã lưu.");             // redirect nằm NGOÀI try/catch
 */

export type Attempt<T> =
  { ok: true; value: T } | { ok: false; message: string };

/** Chạy `work`, trả về kết quả hoặc thông điệp lỗi thân thiện thay vì ném lỗi. */
export async function attempt<T>(work: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    // Nếu là lỗi điều hướng nội bộ của Next.js (redirect, notFound...) thì ném lại.
    unstable_rethrow(error);
    return { ok: false, message: toUserMessage(error) };
  }
}

function pathWithQuery(path: string, query: Record<string, string>): string {
  return `${path}?${new URLSearchParams(query)}`;
}

/** Làm mới dữ liệu các trang liên quan rồi chuyển về `path` kèm thông báo thành công. */
export function redirectWithNotice(
  path: string,
  notice: string,
  alsoRevalidate: string[] = []
): never {
  for (const pathToRevalidate of [path, ...alsoRevalidate]) {
    revalidatePath(pathToRevalidate);
  }
  redirect(pathWithQuery(path, { notice }));
}

/** Chuyển về `path` kèm thông báo lỗi. */
export function redirectWithError(path: string, message: string): never {
  redirect(pathWithQuery(path, { error: message }));
}
