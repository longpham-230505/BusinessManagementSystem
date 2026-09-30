import type { ReactNode } from "react";

export const INLINE_INPUT_CLASS = "ml-2 rounded border border-line p-2";

/**
 * Form của một sự kiện trong vòng đời đơn thuê: gửi `orderId` kèm các trường
 * riêng của sự kiện (`children`) tới Server Action tương ứng.
 */
export function EventForm({
  orderId,
  action,
  submitLabel,
  children,
}: {
  orderId: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      {children}
      <button className="rounded bg-accent px-3 py-2 text-sm text-paper">
        {submitLabel}
      </button>
    </form>
  );
}

/** Ô nhập nằm cùng dòng với nhãn, dùng trong `EventForm`. */
export function InlineField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      {label}
      {children}
    </label>
  );
}
