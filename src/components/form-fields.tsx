import Link from "next/link";
import type { ReactNode } from "react";
import { setMasterDataDeleted } from "@/server/master-data";

const INPUT_CLASS = "w-full rounded border border-line px-3 py-2";

type FieldProps = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local";
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  /** Giá trị nhỏ nhất của ô số (mặc định 0); truyền `null` để cho phép số âm. */
  min?: number | null;
  /** Ví dụ `md:col-span-2` để trải rộng trong grid. */
  className?: string;
};

export function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  min,
  className = "",
}: FieldProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-ink/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={type === "number" ? (min === undefined ? 0 : (min ?? undefined)) : undefined}
        className={INPUT_CLASS}
      />
    </label>
  );
}

export function SelectField({
  name,
  label,
  required = false,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink/70">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      >
        {children}
      </select>
    </label>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

export function SubmitButton({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`rounded bg-accent px-4 py-2 text-sm font-medium text-paper ${className}`}
    >
      {children}
    </button>
  );
}

/** Nút "Xóa" (xóa mềm) dùng chung cho mọi loại dữ liệu nền. */
export function SoftDeleteForm({ entity, id }: { entity: string; id: string }) {
  return (
    <form action={setMasterDataDeleted}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <button className="text-red-700">Xóa</button>
    </form>
  );
}

/** Nhóm thao tác ở cuối mỗi dòng danh sách: Sửa + Xóa (xóa mềm). */
export function RowActions({
  editHref,
  entity,
  id,
}: {
  editHref: string;
  entity: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link href={editHref} className="text-accent underline">
        Sửa
      </Link>
      <SoftDeleteForm entity={entity} id={id} />
    </div>
  );
}

export const TABLE_WRAPPER_CLASS =
  "overflow-x-auto rounded-lg border border-line bg-white";
