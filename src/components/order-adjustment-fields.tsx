import { Field } from "@/components/form-fields";

export type OrderAdjustmentValues = {
  discountAmount: string;
  surchargeAmount: string;
  surchargeNote: string;
  shippingFee: string;
};

/**
 * Các khoản điều chỉnh tiền của đơn (dùng chung cho đơn thuê, bán phim, in ảnh):
 * giảm giá, phụ thu (kèm lý do) và phí ship. Công thức xem `order-totals.ts`.
 */
export function OrderAdjustmentFields({ defaults }: { defaults?: OrderAdjustmentValues }) {
  return (
    <>
      <Field
        name="discountAmount"
        label="Giảm giá (số tiền cố định)"
        type="number"
        defaultValue={defaults?.discountAmount ?? "0"}
      />
      <Field
        name="surchargeAmount"
        label="Phụ thu (cộng vào doanh thu)"
        type="number"
        defaultValue={defaults?.surchargeAmount ?? "0"}
      />
      <Field
        name="surchargeNote"
        label="Lý do phụ thu"
        placeholder="Ví dụ: trả máy trễ, vệ sinh máy..."
        defaultValue={defaults?.surchargeNote ?? ""}
      />
      <Field
        name="shippingFee"
        label="Phí ship (chỉ ghi nhận, không tính doanh thu)"
        type="number"
        defaultValue={defaults?.shippingFee ?? "0"}
      />
    </>
  );
}
