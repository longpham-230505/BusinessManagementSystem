"use server";

import { DepositKind, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { assertRentalAvailability, nextRentalOrderCode, receiveBookingDeposit, RentalRuleError, rentalDays, rentalPricing, returnRental, resolveDeposit, startRental } from "@/server/services/rental.service";

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const money = (form: FormData, key: string) => { const value = field(form, key); const amount = new Prisma.Decimal(value || 0); if (amount.isNegative() || !amount.isInteger()) throw new RentalRuleError("Số tiền phải là VND không âm, không có số lẻ."); return amount; };
const date = (form: FormData, key: string) => { const value = field(form, key); const result = new Date(value); if (!value || Number.isNaN(result.getTime())) throw new RentalRuleError("Ngày giờ không hợp lệ."); return result; };
const orderPath = (id?: string) => id ? `/orders/${id}` : "/orders";
function done(path: string, notice: string) { revalidatePath("/orders"); revalidatePath(path); redirect(`${path}?notice=${encodeURIComponent(notice)}`); }
function failed(path: string, error: unknown) { const message = error instanceof Error ? error.message : "Không thể xử lý đơn thuê."; redirect(`${path}?error=${encodeURIComponent(message)}`); }

export async function createRentalOrder(form: FormData) {
  const path = "/orders/new";
  try {
    const customerId = field(form, "customerId"), branchId = field(form, "branchId");
    const cameraIds = form.getAll("cameraIds").map(String);
    if (!customerId || !branchId || !cameraIds.length) throw new RentalRuleError("Hãy chọn khách hàng, cơ sở và ít nhất một máy.");
    if (new Set(cameraIds).size !== cameraIds.length) throw new RentalRuleError("Một máy chỉ được chọn một lần.");
    const pickupAt = date(form, "pickupAt"), returnDueAt = date(form, "returnDueAt");
    const days = rentalDays(pickupAt, returnDueAt);
    const order = await prisma.$transaction(async (db) => {
      const cameras = await assertRentalAvailability(db, cameraIds, pickupAt, returnDueAt);
      const cameraById = new Map(cameras.map((camera) => [camera.id, camera]));
      const records = await db.cameraInstance.findMany({ where: { id: { in: cameraIds } }, select: { id: true, price1day: true, priceCombo3: true } });
      const code = await nextRentalOrderCode(db);
      return db.order.create({ data: { orderCode: code, orderType: "RENTAL", status: "PENDING_BOOKING_DEPOSIT", customerId, branchId, orderDate: new Date(), shippingFee: 0, discountAmount: 0, surchargeAmount: 0, notes: field(form, "notes") || null, rentalDetail: { create: { pickupAt, returnDueAt, rentalDays: days } }, rentalItems: { create: records.map((camera) => { const price = rentalPricing(days, camera.price1day, camera.priceCombo3); return { cameraInstanceId: camera.id, unitPrice1day: camera.price1day, unitPriceCombo3: camera.priceCombo3, ...price }; }) } } });
    });
    done(orderPath(order.id), "Đã tạo đơn thuê. Hãy nhận cọc giữ chỗ để xác nhận đặt máy.");
  } catch (error) { failed(path, error); }
}

export async function rentalEvent(form: FormData) {
  const orderId = field(form, "orderId"); const event = field(form, "event"); const path = orderPath(orderId);
  try {
    await prisma.$transaction(async (db) => {
      if (event === "booking") await receiveBookingDeposit(db, orderId, money(form, "amount"), new Date());
      else if (event === "start") await startRental(db, orderId, field(form, "securityKind") as DepositKind, money(form, "amount"), field(form, "itemDescription") || null, new Date());
      else if (event === "return") { const branch = field(form, "returnBranchId"); if (!branch) throw new RentalRuleError("Hãy chọn cơ sở nhận máy."); await returnRental(db, orderId, branch, new Date()); }
      else if (event === "resolve") await resolveDeposit(db, orderId, field(form, "depositId"), money(form, "refunded"), money(form, "forfeited"), field(form, "resolutionNote") || null, new Date());
      else if (event === "complete") await db.order.update({ where: { id: orderId }, data: { status: "COMPLETED", completedAt: new Date() } });
      else if (event === "cancel") { await db.rentalItem.updateMany({ where: { orderId }, data: { isBlocking: false } }); await db.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } }); }
      else throw new RentalRuleError("Sự kiện không hợp lệ.");
    });
    done(path, "Đã cập nhật trạng thái đơn thuê.");
  } catch (error) { failed(path, error); }
}
