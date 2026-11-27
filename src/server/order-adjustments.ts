import type { Prisma } from "@prisma/client";
import type { FormReader } from "@/lib/form-reader";

/** Các khoản điều chỉnh tiền lưu trên `Order` (dùng chung cho mọi loại đơn). */
export type OrderAdjustments = {
  discountAmount: Prisma.Decimal;
  surchargeAmount: Prisma.Decimal;
  surchargeNote: string | null;
  shippingFee: Prisma.Decimal;
};

/** Đọc giảm giá / phụ thu / phí ship từ form (xem `OrderAdjustmentFields`). */
export function readOrderAdjustments(form: FormReader): OrderAdjustments {
  const surchargeAmount = form.vndOrZero("surchargeAmount", "Phụ thu");
  return {
    discountAmount: form.vndOrZero("discountAmount", "Giảm giá"),
    surchargeAmount,
    // Không có phụ thu thì không giữ lại lý do cũ.
    surchargeNote: surchargeAmount.isZero() ? null : form.text("surchargeNote"),
    shippingFee: form.vndOrZero("shippingFee", "Phí ship"),
  };
}
