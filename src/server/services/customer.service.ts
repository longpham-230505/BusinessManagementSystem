import { prisma } from "@/server/db";

/** Dữ liệu một khách hàng khi tạo / sửa. */
export type CustomerData = {
  name: string;
  phone: string | null;
  contactChannel: string | null;
  contactHandle: string | null;
  isFlagged: boolean;
  notes: string | null;
};

/** Phần thông tin đủ để hiển thị khách trong ô chọn khách của form đơn hàng. */
export type CustomerOption = { id: string; name: string; phone: string | null };

export function createCustomer(data: CustomerData): Promise<CustomerOption> {
  return prisma.customer.create({
    data,
    select: { id: true, name: true, phone: true },
  });
}
