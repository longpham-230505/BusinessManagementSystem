import { CameraInstanceStatus, OrderStatus, OrderType } from "@prisma/client";
import { addDays } from "@/lib/datetime";
import { DAYS_IN_WEEK } from "@/lib/rental-timeline";
import { prisma } from "@/server/db";

/** Dữ liệu cho bảng lịch tuần của các máy ảnh (trang Dashboard). */

export async function loadCameraTimeline(weekStart: Date) {
  const weekEnd = addDays(weekStart, DAYS_IN_WEEK);

  const [cameras, rentalItems] = await Promise.all([
    prisma.cameraInstance.findMany({
      where: { deletedAt: null, active: true, status: { not: CameraInstanceStatus.RETIRED } },
      select: {
        id: true,
        assetCode: true,
        status: true,
        cameraModel: { select: { name: true } },
      },
    }),
    prisma.rentalItem.findMany({
      where: {
        isBlocking: true,
        order: {
          deletedAt: null,
          orderType: OrderType.RENTAL,
          status: { not: OrderStatus.CANCELLED },
          // Cùng điều kiện giao nhau với `findConflictingAssetCodes` (rental-availability.ts):
          // đơn đã trả máy tính đến `returnedAt`, chưa trả thì tính đến `returnDueAt`.
          rentalDetail: {
            pickupAt: { lt: weekEnd },
            OR: [
              { returnedAt: { gt: weekStart } },
              { returnedAt: null, returnDueAt: { gt: weekStart } },
            ],
          },
        },
      },
      select: {
        cameraInstanceId: true,
        order: {
          select: {
            id: true,
            orderCode: true,
            status: true,
            notes: true,
            customer: { select: { name: true, contactChannel: true } },
            rentalDetail: {
              select: { pickupAt: true, returnDueAt: true, returnedAt: true, rentalDays: true },
            },
          },
        },
      },
    }),
  ]);

  // Máy xếp theo tên dòng máy rồi mã máy; so sánh theo số để "Mini 2" đứng trước "Mini 10".
  const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
  cameras.sort(
    (a, b) =>
      collator.compare(a.cameraModel.name, b.cameraModel.name) ||
      collator.compare(a.assetCode, b.assetCode)
  );

  const bookings = rentalItems.flatMap((item) => {
    const detail = item.order.rentalDetail;
    if (!detail) return [];
    return [
      {
        cameraId: item.cameraInstanceId,
        start: detail.pickupAt,
        end: detail.returnedAt ?? detail.returnDueAt,
        order: item.order,
        returnDueAt: detail.returnDueAt,
        rentalDays: detail.rentalDays,
      },
    ];
  });

  return { cameras, bookings };
}

export type TimelineCamera = Awaited<ReturnType<typeof loadCameraTimeline>>["cameras"][number];
export type TimelineBookingRow = Awaited<ReturnType<typeof loadCameraTimeline>>["bookings"][number];
