import { OrderType } from "@prisma/client";
import { prisma } from "@/server/db";

/** Các truy vấn đọc dữ liệu cho các trang đơn thuê. */

export function listRentalOrders() {
  return prisma.order.findMany({
    where: { orderType: OrderType.RENTAL, deletedAt: null },
    include: {
      customer: true,
      branch: true,
      rentalDetail: true,
      rentalItems: { include: { cameraInstance: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findRentalOrderDetail(id: string) {
  return prisma.order.findFirst({
    where: { id, orderType: OrderType.RENTAL, deletedAt: null },
    include: {
      customer: true,
      branch: true,
      rentalDetail: true,
      rentalItems: {
        include: {
          cameraInstance: { include: { branch: true, cameraModel: true } },
        },
      },
      deposits: true,
    },
  });
}

export type RentalOrderDetail = NonNullable<
  Awaited<ReturnType<typeof findRentalOrderDetail>>
>;

/** Dữ liệu cho các ô chọn trong form tạo đơn thuê. */
export async function loadNewRentalOrderOptions() {
  const [customers, branches, cameras] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.cameraInstance.findMany({
      where: { deletedAt: null, active: true },
      include: { cameraModel: true, branch: true },
      orderBy: { assetCode: "asc" },
    }),
  ]);
  return { customers, branches, cameras };
}
