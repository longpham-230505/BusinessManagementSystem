import { OrderStatus, OrderType, type Prisma } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { prisma } from "@/server/db";
import { BusinessRuleError } from "@/server/errors";
import {
  recordBookingDeposit,
  recordSecurityDeposit,
  settleDeposit,
  type SecurityDepositKind,
} from "@/server/services/deposit.service";
import { generateOrderCode } from "@/server/services/order-code";
import {
  loadRentableCameras,
  type RentableCamera,
} from "@/server/services/rental-availability";
import {
  calculateRentalDays,
  calculateRentalPrice,
} from "@/server/services/rental-pricing";
import type { Db } from "@/server/services/types";

/**
 * Vòng đời đơn thuê:
 *
 *   PENDING_BOOKING_DEPOSIT → BOOKED → RENTING → RETURNED → COMPLETED
 *
 * Đơn có thể chuyển sang CANCELLED từ bất kỳ trạng thái nào chưa kết thúc.
 * Mỗi hàm public bên dưới là MỘT sự kiện nghiệp vụ và chạy trong MỘT transaction.
 */

/** Trạng thái chưa kết thúc — những trạng thái còn được phép hủy đơn. */
const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_BOOKING_DEPOSIT,
  OrderStatus.BOOKED,
  OrderStatus.RENTING,
  OrderStatus.RETURNED,
];

// ---------------------------------------------------------------------------
// Chuyển trạng thái
// ---------------------------------------------------------------------------

/**
 * Chuyển đơn thuê từ một trong các trạng thái `allowedFrom` sang `to`.
 *
 * Việc kiểm tra và cập nhật diễn ra trong MỘT câu UPDATE có điều kiện, nên nếu
 * người dùng bấm hai lần hoặc mở hai tab thì chỉ một thao tác được áp dụng.
 */
async function transitionOrder(
  db: Db,
  orderId: string,
  allowedFrom: OrderStatus[],
  to: OrderStatus,
  extraData: Prisma.OrderUpdateManyMutationInput = {}
) {
  const { count } = await db.order.updateMany({
    where: {
      id: orderId,
      orderType: OrderType.RENTAL,
      deletedAt: null,
      status: { in: allowedFrom },
    },
    data: { status: to, ...extraData },
  });

  if (count === 0) {
    // Không cập nhật được: báo rõ đơn không tồn tại hay đang sai trạng thái.
    await assertOrderStatus(db, orderId, allowedFrom);
    throw new BusinessRuleError(
      "Đơn vừa được cập nhật bởi một thao tác khác. Hãy tải lại trang."
    );
  }
}

/** Đảm bảo đơn thuê tồn tại và đang ở một trong các trạng thái `allowed`. */
async function assertOrderStatus(
  db: Db,
  orderId: string,
  allowed: OrderStatus[]
) {
  const order = await db.order.findFirst({
    where: { id: orderId, orderType: OrderType.RENTAL, deletedAt: null },
    select: { status: true },
  });

  if (!order) throw new BusinessRuleError("Không tìm thấy đơn thuê.");
  if (!allowed.includes(order.status)) {
    throw new BusinessRuleError(
      `Đơn đang ở trạng thái "${ORDER_STATUS_LABEL[order.status]}" nên không thể thực hiện thao tác này.`
    );
  }
}

// ---------------------------------------------------------------------------
// Tạo đơn
// ---------------------------------------------------------------------------

export type CreateRentalOrderInput = {
  customerId: string;
  branchId: string;
  cameraIds: string[];
  pickupAt: Date;
  returnDueAt: Date;
  notes: string | null;
};

/** Tạo đơn thuê ở trạng thái chờ cọc giữ chỗ và tính sẵn tiền thuê từng máy. */
export async function createRentalOrder(
  input: CreateRentalOrderInput
): Promise<{ id: string }> {
  const { customerId, branchId, cameraIds, pickupAt, returnDueAt, notes } =
    input;

  if (new Set(cameraIds).size !== cameraIds.length) {
    throw new BusinessRuleError("Một máy chỉ được chọn một lần.");
  }
  const rentalDays = calculateRentalDays(pickupAt, returnDueAt);

  return prisma.$transaction(async (db) => {
    const cameras = await loadRentableCameras(db, cameraIds, {
      pickupAt,
      returnDueAt,
    });
    const orderCode = await generateOrderCode(db, OrderType.RENTAL);

    return db.order.create({
      data: {
        orderCode,
        orderType: OrderType.RENTAL,
        status: OrderStatus.PENDING_BOOKING_DEPOSIT,
        customerId,
        branchId,
        orderDate: new Date(),
        notes,
        rentalDetail: { create: { pickupAt, returnDueAt, rentalDays } },
        rentalItems: {
          create: cameras.map((camera) => buildRentalItem(camera, rentalDays)),
        },
      },
      select: { id: true },
    });
  });
}

/** Dòng RentalItem: lưu cả giá tại thời điểm tạo đơn để đổi giá sau này không ảnh hưởng đơn cũ. */
function buildRentalItem(camera: RentableCamera, rentalDays: number) {
  return {
    cameraInstanceId: camera.id,
    unitPrice1day: camera.price1day,
    unitPriceCombo3: camera.priceCombo3,
    ...calculateRentalPrice(rentalDays, camera.price1day, camera.priceCombo3),
  };
}

// ---------------------------------------------------------------------------
// Các sự kiện trong vòng đời
// ---------------------------------------------------------------------------

/** Nhận cọc giữ chỗ: PENDING_BOOKING_DEPOSIT → BOOKED. */
export async function receiveBookingDeposit(input: {
  orderId: string;
  amount: Prisma.Decimal;
  at?: Date;
}) {
  const { orderId, amount, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    await transitionOrder(
      db,
      orderId,
      [OrderStatus.PENDING_BOOKING_DEPOSIT],
      OrderStatus.BOOKED
    );
    await recordBookingDeposit(db, { orderId, amount, receivedAt: at });
  });
}

/** Giao máy (kèm cọc bảo đảm và CCCD): BOOKED → RENTING. */
export async function startRental(input: {
  orderId: string;
  securityDepositKind: SecurityDepositKind;
  cashAmount: Prisma.Decimal;
  itemDescription: string | null;
  at?: Date;
}) {
  const { orderId, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    await transitionOrder(
      db,
      orderId,
      [OrderStatus.BOOKED],
      OrderStatus.RENTING
    );
    await recordSecurityDeposit(db, {
      orderId,
      kind: input.securityDepositKind,
      cashAmount: input.cashAmount,
      itemDescription: input.itemDescription,
      receivedAt: at,
    });
    await db.rentalDetail.update({
      where: { orderId },
      data: { idCardReceivedAt: at },
    });
  });
}

/**
 * Nhận máy trả: RENTING → RETURNED.
 * Máy được trả về cơ sở khác cơ sở hiện tại sẽ tự động ghi CameraMovement
 * và cập nhật cơ sở của máy.
 */
export async function returnRental(input: {
  orderId: string;
  returnBranchId: string;
  at?: Date;
}) {
  const { orderId, returnBranchId, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    await transitionOrder(
      db,
      orderId,
      [OrderStatus.RENTING],
      OrderStatus.RETURNED
    );
    await db.rentalDetail.update({
      where: { orderId },
      data: { returnedAt: at, returnBranchId },
    });
    await moveCamerasToBranch(db, orderId, returnBranchId, at);
  });
}

async function moveCamerasToBranch(
  db: Db,
  orderId: string,
  toBranchId: string,
  movedAt: Date
) {
  const items = await db.rentalItem.findMany({
    where: { orderId },
    select: { cameraInstance: { select: { id: true, branchId: true } } },
  });

  for (const { cameraInstance } of items) {
    if (cameraInstance.branchId === toBranchId) continue;

    await db.cameraMovement.create({
      data: {
        cameraInstanceId: cameraInstance.id,
        fromBranchId: cameraInstance.branchId,
        toBranchId,
        orderId,
        movedAt,
      },
    });
    await db.cameraInstance.update({
      where: { id: cameraInstance.id },
      data: { branchId: toBranchId },
    });
  }
}

/** Xử lý (hoàn/giữ) một khoản cọc — chỉ làm được sau khi đã trả máy. */
export async function resolveRentalDeposit(input: {
  orderId: string;
  depositId: string;
  refunded: Prisma.Decimal;
  forfeited: Prisma.Decimal;
  note: string | null;
  at?: Date;
}) {
  const { orderId, at = new Date(), ...settlement } = input;

  await prisma.$transaction(async (db) => {
    await assertOrderStatus(db, orderId, [OrderStatus.RETURNED]);
    await settleDeposit(db, { orderId, settledAt: at, ...settlement });
  });
}

/** Hoàn tất đơn: RETURNED → COMPLETED. */
export async function completeRental(input: { orderId: string; at?: Date }) {
  const { orderId, at = new Date() } = input;

  await prisma.$transaction((db) =>
    transitionOrder(
      db,
      orderId,
      [OrderStatus.RETURNED],
      OrderStatus.COMPLETED,
      {
        completedAt: at,
      }
    )
  );
}

/** Hủy đơn và nhả lịch của các máy (để đơn khác có thể thuê lại). */
export async function cancelRental(input: { orderId: string; at?: Date }) {
  const { orderId, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    await transitionOrder(
      db,
      orderId,
      CANCELLABLE_STATUSES,
      OrderStatus.CANCELLED,
      {
        cancelledAt: at,
      }
    );
    await db.rentalItem.updateMany({
      where: { orderId },
      data: { isBlocking: false },
    });
  });
}
