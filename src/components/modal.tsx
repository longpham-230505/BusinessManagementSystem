"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Hộp thoại (popup) dùng thẻ `<dialog>` gốc của trình duyệt: có sẵn phím Esc để đóng
 * và khóa focus trong hộp thoại. Chỉ render khi đang mở (nên luôn chạy ở phía client).
 *
 * Nội dung được render qua portal vào `document.body` thay vì nằm tại chỗ: hộp thoại
 * thường được mở từ BÊN TRONG một `<form>` khác (ví dụ form tạo đơn), mà HTML không cho
 * phép form lồng form.
 *
 * Cố ý KHÔNG đóng khi bấm ra ngoài hộp thoại, để không mất dữ liệu đang nhập do bấm nhầm.
 */
export function Modal({
  title,
  onClose,
  children,
  widthClass = "max-w-3xl",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`m-auto w-[calc(100%-2rem)] ${widthClass} rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/40`}
    >
      <div className="max-h-[85vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng"
            className="px-2 text-xl leading-none text-ink/60 hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body
  );
}

export const PRIMARY_BUTTON_CLASS =
  "rounded bg-accent px-4 py-2 text-sm font-medium text-paper disabled:opacity-60";
export const SECONDARY_BUTTON_CLASS = "rounded border border-line px-4 py-2 text-sm hover:bg-ink/5";
