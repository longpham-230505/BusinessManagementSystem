import { DepositKind, OrderStatus, PaymentDirection, PaymentType, Prisma } from "@prisma/client";

export class RentalRuleError extends Error {}

type Db = Prisma.TransactionClient;

export function rentalPricing(days: number, price1day: Prisma.Decimal | number, priceCombo3: Prisma.Decimal | number) {
  if (!Number.isInteger(days) || days <= 0) throw new RentalRuleError("Thời gian thuê phải ít nhất một ngày.");
  const combo3Count = Math.floor(days / 3);
  const singleDayCount = days % 3;
  const rentalFee = new Prisma.Decimal(priceCombo3).mul(combo3Count).add(new Prisma.Decimal(price1day).mul(singleDayCount));
  return { combo3Count, singleDayCount, rentalFee };
}

export function rentalDays(pickupAt: Date, returnDueAt: Date) {
  const diff = returnDueAt.getTime() - pickupAt.getTime();
  if (diff <= 0) throw new RentalRuleError("Thời điểm trả phải sau thời điểm nhận máy.");
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export async function assertRentalAvailability(db: Db, cameraIds: string[], pickupAt: Date, returnDueAt: Date) {
  const cameras = await db.cameraInstance.findMany({ where: { id: { in: cameraIds }, deletedAt: null }, select: { id: true, assetCode: true, status: true } });
  if (cameras.length !== cameraIds.length) throw new RentalRuleError("Một hoặc nhiều máy không còn tồn tại.");
  const retired = cameras.find((camera) => camera.status === "RETIRED");
  if (retired) throw new RentalRuleError(`Máy ${retired.assetCode} đã ngừng sử dụng và không thể cho thuê.`);

  const conflicts = await db.rentalItem.findMany({
    where: { cameraInstanceId: { in: cameraIds }, isBlocking: true, order: { rentalDetail: { pickupAt: { lt: returnDueAt }, OR: [{ returnedAt: { gt: pickupAt } }, { returnedAt: null, returnDueAt: { gt: pickupAt } }] } } },
    include: { cameraInstance: { select: { assetCode: true } } },
  });
  if (conflicts.length) throw new RentalRuleError(`Máy ${conflicts.map((item) => item.cameraInstance.assetCode).join(", ")} đã có lịch thuê trùng thời gian.`);
  return cameras;
}

export async function nextRentalOrderCode(db: Db, now = new Date()) {
  const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const prefix = `RNT-${date}-`;
  const count = await db.order.count({ where: { orderCode: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

export async function receiveBookingDeposit(db: Db, orderId: string, amount: Prisma.Decimal, receivedAt: Date) {
  const existing = await db.deposit.findFirst({ where: { orderId, kind: "BOOKING" } });
  if (existing) throw new RentalRuleError("Đơn đã có cọc giữ chỗ.");
  const deposit = await db.deposit.create({ data: { orderId, kind: "BOOKING", amountReceived: amount, receivedAt } });
  await db.payment.create({ data: { orderId, depositId: deposit.id, paymentType: "BOOKING_DEPOSIT_RECEIVED", direction: PaymentDirection.IN, amount, paymentDate: receivedAt } });
  await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.BOOKED } });
}

export async function startRental(db: Db, orderId: string, securityKind: DepositKind, amount: Prisma.Decimal, itemDescription: string | null, at: Date) {
  if (securityKind === "BOOKING") throw new RentalRuleError("Loại cọc bảo đảm không hợp lệ.");
  const existing = await db.deposit.findFirst({ where: { orderId, kind: { in: ["SECURITY_CASH", "SECURITY_ITEM", "SECURITY_NONE"] } } });
  if (existing) throw new RentalRuleError("Đơn đã có cọc bảo đảm.");
  if ((securityKind === "SECURITY_ITEM" || securityKind === "SECURITY_NONE") && !amount.isZero()) throw new RentalRuleError("Cọc tài sản hoặc không cọc phải có giá trị tiền mặt bằng 0.");
  const deposit = await db.deposit.create({ data: { orderId, kind: securityKind, amountReceived: amount, itemDescription, receivedAt: at } });
  if (securityKind === "SECURITY_CASH" && amount.gt(0)) await db.payment.create({ data: { orderId, depositId: deposit.id, paymentType: PaymentType.SECURITY_DEPOSIT_RECEIVED, direction: PaymentDirection.IN, amount, paymentDate: at } });
  await db.rentalDetail.update({ where: { orderId }, data: { idCardReceivedAt: at } });
  await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.RENTING } });
}

export async function returnRental(db: Db, orderId: string, returnBranchId: string, at: Date) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { rentalItems: { include: { cameraInstance: true } } } });
  await db.rentalDetail.update({ where: { orderId }, data: { returnedAt: at, returnBranchId } });
  for (const item of order.rentalItems) if (item.cameraInstance.branchId !== returnBranchId) {
    await db.cameraMovement.create({ data: { cameraInstanceId: item.cameraInstanceId, fromBranchId: item.cameraInstance.branchId, toBranchId: returnBranchId, orderId, movedAt: at } });
    await db.cameraInstance.update({ where: { id: item.cameraInstanceId }, data: { branchId: returnBranchId } });
  }
  await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.RETURNED } });
}

export async function resolveDeposit(db: Db, orderId: string, depositId: string, refunded: Prisma.Decimal, forfeited: Prisma.Decimal, note: string | null, at: Date) {
  const deposit = await db.deposit.findFirst({ where: { id: depositId, orderId } });
  if (!deposit) throw new RentalRuleError("Không tìm thấy khoản cọc của đơn.");
  if (refunded.add(forfeited).gt(deposit.amountReceived)) throw new RentalRuleError("Tổng hoàn và giữ cọc không được vượt số tiền đã nhận.");
  await db.deposit.update({ where: { id: depositId }, data: { amountRefunded: refunded, amountForfeited: forfeited, resolutionNote: note, resolvedAt: at } });
  if (refunded.gt(0)) await db.payment.create({ data: { orderId, depositId, paymentType: deposit.kind === "BOOKING" ? "BOOKING_DEPOSIT_REFUNDED" : "SECURITY_DEPOSIT_REFUNDED", direction: "OUT", amount: refunded, paymentDate: at, notes: note } });
}
