import type { OrderType } from "@prisma/client";

/**
 * Mốc thời gian "đơn này phải được phục vụ khi nào" và cách sắp xếp danh sách đơn theo mốc đó.
 * Hàm thuần, không đụng database.
 */

export type ScheduledOrder = {
  orderType: OrderType;
  customerId: string;
  createdAt: Date;
  orderDate: Date;
  serviceAt: Date | null;
  rentalDetail: { pickupAt: Date } | null;
};

/**
 * Thời điểm đơn phải được phục vụ:
 * - Thuê máy: thời điểm nhận máy (`rental_details.pickup_at`).
 * - Bán phim / in ảnh: `service_at`; đơn cũ chưa có thì dùng ngày lập đơn.
 */
export function getOrderScheduledAt(order: ScheduledOrder): Date | null {
  if (order.orderType === "RENTAL") return order.rentalDetail?.pickupAt ?? null;
  return order.serviceAt ?? order.orderDate;
}

const timeOf = (date: Date | null) => date?.getTime() ?? Number.POSITIVE_INFINITY;

/**
 * Thứ tự hiển thị trong danh sách đơn — áp dụng cho MỌI loại đơn:
 *
 * 1. Đơn xếp theo thời điểm phục vụ tăng dần (đơn gần/sớm hơn nằm trên).
 * 2. Các đơn của CÙNG MỘT khách được gom thành một cụm liền nhau (khách có thể đặt nhiều
 *    dịch vụ: thuê máy + mua phim + in ảnh). Cụm được đặt theo đơn sớm nhất của khách đó,
 *    và trong cụm các đơn cũng xếp theo thời điểm phục vụ tăng dần.
 */
export function sortOrdersForList<T extends ScheduledOrder>(orders: T[]): T[] {
  const byCustomer = new Map<string, T[]>();
  for (const order of orders) {
    const group = byCustomer.get(order.customerId) ?? [];
    group.push(order);
    byCustomer.set(order.customerId, group);
  }

  const clusters = [...byCustomer.values()].map((group) => group.sort(compareWithinCluster));
  clusters.sort((a, b) => compareWithinCluster(a[0], b[0]));

  return clusters.flat();
}

function compareWithinCluster(a: ScheduledOrder, b: ScheduledOrder): number {
  return (
    timeOf(getOrderScheduledAt(a)) - timeOf(getOrderScheduledAt(b)) ||
    a.createdAt.getTime() - b.createdAt.getTime()
  );
}
