import { CustomerFields } from "@/components/customer-fields";
import { CustomerPicker } from "@/components/customer-picker";
import { createCustomerFromDialogAction } from "@/server/dialog-actions";

/**
 * Ô chọn khách hàng cho mọi form đơn hàng (thuê máy, bán phim, in ảnh; tạo lẫn sửa):
 * chọn khách có sẵn hoặc tạo khách mới bằng hộp thoại mà không rời khỏi form.
 */
export function CustomerSelectField({
  customers,
  defaultValue,
}: {
  customers: { id: string; name: string; phone?: string | null }[];
  defaultValue?: string;
}) {
  return (
    <CustomerPicker
      customers={customers.map(({ id, name, phone }) => ({ id, name, phone: phone ?? null }))}
      defaultValue={defaultValue}
      createCustomer={createCustomerFromDialogAction}
    >
      <CustomerFields />
    </CustomerPicker>
  );
}
