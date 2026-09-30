import type { OrderStatus } from "@prisma/client";
import { DEPOSIT_KIND_LABEL } from "@/lib/labels";
import { formatVnd } from "@/lib/money";
import {
  cancelRentalAction,
  completeRentalAction,
  receiveBookingDepositAction,
  resolveDepositAction,
  returnRentalAction,
  startRentalAction,
} from "@/server/rental-actions";
import type { RentalOrderDetail } from "@/server/queries/rental-orders.queries";
import { EventForm, INLINE_INPUT_CLASS, InlineField } from "./event-form";

const FINISHED_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

type Branch = { id: string; name: string };

/** Các thao tác khả dụng ở trạng thái hiện tại của đơn thuê. */
export function LifecyclePanel({
  order,
  branches,
}: {
  order: RentalOrderDetail;
  branches: Branch[];
}) {
  const canCancel = !FINISHED_STATUSES.includes(order.status);

  return (
    <section className="space-y-4 rounded border border-line bg-white p-5">
      <h2 className="font-medium">Thao tác vòng đời</h2>

      {order.status === "PENDING_BOOKING_DEPOSIT" && (
        <BookingDepositForm orderId={order.id} />
      )}
      {order.status === "BOOKED" && <StartRentalForm orderId={order.id} />}
      {order.status === "RENTING" && (
        <ReturnRentalForm orderId={order.id} branches={branches} />
      )}
      {order.status === "RETURNED" && <SettlementSection order={order} />}

      {canCancel && (
        <EventForm
          orderId={order.id}
          action={cancelRentalAction}
          submitLabel="Hủy đơn"
        />
      )}
    </section>
  );
}

function BookingDepositForm({ orderId }: { orderId: string }) {
  return (
    <EventForm
      orderId={orderId}
      action={receiveBookingDepositAction}
      submitLabel="Nhận cọc giữ chỗ"
    >
      <InlineField label="Số tiền">
        <input
          required
          name="amount"
          type="number"
          min="0"
          className={`${INLINE_INPUT_CLASS} w-36`}
        />
      </InlineField>
    </EventForm>
  );
}

function StartRentalForm({ orderId }: { orderId: string }) {
  return (
    <EventForm
      orderId={orderId}
      action={startRentalAction}
      submitLabel="Giao máy"
    >
      <InlineField label="Cọc bảo đảm">
        <select name="securityDepositKind" className={INLINE_INPUT_CLASS}>
          <option value="SECURITY_NONE">
            {DEPOSIT_KIND_LABEL.SECURITY_NONE}
          </option>
          <option value="SECURITY_CASH">
            {DEPOSIT_KIND_LABEL.SECURITY_CASH}
          </option>
          <option value="SECURITY_ITEM">
            {DEPOSIT_KIND_LABEL.SECURITY_ITEM}
          </option>
        </select>
      </InlineField>
      <InlineField label="Tiền">
        <input
          name="cashAmount"
          type="number"
          min="0"
          defaultValue="0"
          className={`${INLINE_INPUT_CLASS} w-28`}
        />
      </InlineField>
      <InlineField label="Mô tả tài sản">
        <input name="itemDescription" className={INLINE_INPUT_CLASS} />
      </InlineField>
    </EventForm>
  );
}

function ReturnRentalForm({
  orderId,
  branches,
}: {
  orderId: string;
  branches: Branch[];
}) {
  return (
    <EventForm
      orderId={orderId}
      action={returnRentalAction}
      submitLabel="Nhận trả máy"
    >
      <InlineField label="Cơ sở nhận">
        <select required name="returnBranchId" className={INLINE_INPUT_CLASS}>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </InlineField>
    </EventForm>
  );
}

/** Sau khi trả máy: xử lý từng khoản cọc chưa giải quyết, rồi hoàn tất đơn. */
function SettlementSection({ order }: { order: RentalOrderDetail }) {
  const unresolvedDeposits = order.deposits.filter(
    (deposit) => !deposit.resolvedAt
  );

  return (
    <>
      <div className="space-y-2">
        {unresolvedDeposits.map((deposit) => (
          <EventForm
            key={deposit.id}
            orderId={order.id}
            action={resolveDepositAction}
            submitLabel="Xử lý cọc"
          >
            <input type="hidden" name="depositId" value={deposit.id} />
            <span className="text-sm">
              {DEPOSIT_KIND_LABEL[deposit.kind]}: đã nhận{" "}
              {formatVnd(deposit.amountReceived)}
            </span>
            <InlineField label="Hoàn">
              <input
                name="refunded"
                type="number"
                min="0"
                defaultValue="0"
                className={`${INLINE_INPUT_CLASS} w-24`}
              />
            </InlineField>
            <InlineField label="Giữ">
              <input
                name="forfeited"
                type="number"
                min="0"
                defaultValue="0"
                className={`${INLINE_INPUT_CLASS} w-24`}
              />
            </InlineField>
            <input
              name="resolutionNote"
              placeholder="Lý do"
              className="rounded border border-line p-2 text-sm"
            />
          </EventForm>
        ))}
      </div>
      <EventForm
        orderId={order.id}
        action={completeRentalAction}
        submitLabel="Hoàn tất đơn"
      />
    </>
  );
}
