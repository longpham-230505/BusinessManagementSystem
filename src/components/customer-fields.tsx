import type { Customer } from "@prisma/client";
import { CheckboxField, Field } from "@/components/form-fields";

/** Các trường của khách hàng — dùng chung cho form thêm và form sửa. */
export function CustomerFields({ customer }: { customer?: Customer }) {
  return (
    <>
      <Field name="name" label="Tên khách hàng" required defaultValue={customer?.name} />
      <Field name="phone" label="Số điện thoại" defaultValue={customer?.phone ?? undefined} />
      <Field
        name="contactChannel"
        label="Kênh liên hệ"
        placeholder="Facebook, Zalo…"
        defaultValue={customer?.contactChannel ?? undefined}
      />
      <Field
        name="contactHandle"
        label="Tài khoản liên hệ"
        defaultValue={customer?.contactHandle ?? undefined}
      />
      <Field name="notes" label="Ghi chú" defaultValue={customer?.notes ?? undefined} />
      <div className="flex items-end pb-2">
        <CheckboxField
          name="isFlagged"
          label="Khách cần lưu ý"
          defaultChecked={customer?.isFlagged ?? false}
        />
      </div>
    </>
  );
}
