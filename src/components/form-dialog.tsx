"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { DialogActionResult } from "@/lib/action-result";
import { Modal, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/modal";

/**
 * Nút + hộp thoại "Thêm mới" cho các trang danh sách (Máy ảnh, Khách hàng).
 *
 * Gửi form tới Server Action trả về kết quả: lỗi thì hiện ngay trong hộp thoại và giữ
 * nguyên dữ liệu đang nhập; thành công thì đóng hộp thoại, tải lại danh sách và hiện thông báo.
 * Các trường của form được truyền vào qua `children`.
 */
export function FormDialog({
  triggerLabel,
  title,
  submitLabel,
  action,
  gridClassName = "md:grid-cols-2",
  widthClass,
  children,
}: {
  triggerLabel: string;
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<DialogActionResult<unknown>>;
  /** Số cột của lưới các trường, ví dụ `md:grid-cols-3`. */
  gridClassName?: string;
  widthClass?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const result = await action(new FormData(event.currentTarget));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIsOpen(false);
      router.replace(`${pathname}?${new URLSearchParams({ notice: result.notice })}`);
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} className={PRIMARY_BUTTON_CLASS}>
        {triggerLabel}
      </button>

      {isOpen && (
        <Modal title={title} onClose={() => setIsOpen(false)} widthClass={widthClass}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className={`grid gap-3 ${gridClassName}`}>{children}</div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={SECONDARY_BUTTON_CLASS}
              >
                Hủy
              </button>
              <button disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
                {isPending ? "Đang lưu…" : submitLabel}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
