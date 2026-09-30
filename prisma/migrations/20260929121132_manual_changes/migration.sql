-- ----------------------------------------------------------
-- 1. Extension cần cho exclusion constraint chống double booking
-- ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------
-- 2. camera_instances: partial unique cho asset_code
--    (cho phép tái sử dụng mã máy sau khi soft-delete)
-- ----------------------------------------------------------
DROP INDEX IF EXISTS "camera_instances_asset_code_key"; -- nếu Prisma lỡ tạo unique toàn bảng
CREATE UNIQUE INDEX camera_instances_asset_code_active_key
  ON camera_instances (asset_code)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------
-- 3. orders: partial unique cho order_code
-- ----------------------------------------------------------
DROP INDEX IF EXISTS "orders_order_code_key";
CREATE UNIQUE INDEX orders_order_code_active_key
  ON orders (order_code)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------
-- 4. film_batches: quantity_remaining không âm
-- ----------------------------------------------------------
ALTER TABLE film_batches
  ADD CONSTRAINT film_batches_quantity_remaining_nonneg
  CHECK (quantity_remaining >= 0);

-- ----------------------------------------------------------
-- 5. film_sale_items: quantity dương
-- ----------------------------------------------------------
ALTER TABLE film_sale_items
  ADD CONSTRAINT film_sale_items_quantity_positive
  CHECK (quantity > 0);

-- ----------------------------------------------------------
-- 6. photo_print_items: film_quantity đi kèm film_type_id, và dương
-- ----------------------------------------------------------
ALTER TABLE photo_print_items
  ADD CONSTRAINT photo_print_items_film_pair
  CHECK (
    (film_type_id IS NULL AND film_quantity IS NULL)
    OR (film_type_id IS NOT NULL AND film_quantity IS NOT NULL AND film_quantity > 0)
  );

-- ----------------------------------------------------------
-- 7. film_batch_consumptions: đúng 1 trong 2 nguồn được set
-- ----------------------------------------------------------
ALTER TABLE film_batch_consumptions
  ADD CONSTRAINT film_batch_consumptions_single_source
  CHECK (
    (film_sale_item_id IS NOT NULL AND photo_print_item_id IS NULL)
    OR (film_sale_item_id IS NULL AND photo_print_item_id IS NOT NULL)
  );

-- ----------------------------------------------------------
-- 8. deposits: security ITEM/NONE thì amount_received = 0,
--    và tổng hoàn + giữ không vượt quá số đã nhận
-- ----------------------------------------------------------
ALTER TABLE deposits
  ADD CONSTRAINT deposits_item_none_zero_amount
  CHECK (
    kind NOT IN ('SECURITY_ITEM', 'SECURITY_NONE') OR amount_received = 0
  );

ALTER TABLE deposits
  ADD CONSTRAINT deposits_refund_forfeit_within_received
  CHECK (amount_refunded + amount_forfeited <= amount_received);

-- ----------------------------------------------------------
-- 9. rental_items: cột booked_period (tstzrange) + exclusion
--    constraint chống double booking.
--
--    booked_period = [pickup_at, COALESCE(returned_at, return_due_at))
--    Vì pickup_at/return_due_at/returned_at nằm ở bảng rental_details
--    (1 record cho cả đơn) chứ không phải rental_items, dùng trigger
--    để đồng bộ mỗi khi rental_details thay đổi hoặc rental_items
--    được thêm/sửa.
-- ----------------------------------------------------------

ALTER TABLE rental_items
  ADD COLUMN IF NOT EXISTS booked_period tstzrange;

CREATE OR REPLACE FUNCTION sync_rental_item_booked_period(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rental_items ri
  SET booked_period = tstzrange(
    rd.pickup_at,
    COALESCE(rd.returned_at, rd.return_due_at),
    '[)'
  )
  FROM rental_details rd
  WHERE rd.order_id = p_order_id
    AND ri.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: mỗi khi rental_details được insert/update, đồng bộ lại rental_items
CREATE OR REPLACE FUNCTION trg_rental_details_sync_period()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_rental_item_booked_period(NEW.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rental_details_sync_period ON rental_details;
CREATE TRIGGER rental_details_sync_period
  AFTER INSERT OR UPDATE OF pickup_at, return_due_at, returned_at
  ON rental_details
  FOR EACH ROW
  EXECUTE FUNCTION trg_rental_details_sync_period();

-- Trigger: mỗi khi thêm rental_items mới, lấy booked_period từ rental_details có sẵn
CREATE OR REPLACE FUNCTION trg_rental_items_set_period()
RETURNS TRIGGER AS $$
DECLARE
  v_pickup TIMESTAMPTZ;
  v_return_due TIMESTAMPTZ;
  v_returned TIMESTAMPTZ;
BEGIN
  SELECT pickup_at, return_due_at, returned_at
    INTO v_pickup, v_return_due, v_returned
  FROM rental_details
  WHERE order_id = NEW.order_id;

  IF v_pickup IS NOT NULL THEN
    NEW.booked_period := tstzrange(v_pickup, COALESCE(v_returned, v_return_due), '[)');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rental_items_set_period ON rental_items;
CREATE TRIGGER rental_items_set_period
  BEFORE INSERT OR UPDATE OF order_id
  ON rental_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_rental_items_set_period();

-- Exclusion constraint chống double booking: một máy không thể
-- xuất hiện ở 2 dòng rental_items đang "blocking" với thời gian trùng nhau.
ALTER TABLE rental_items
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    camera_instance_id WITH =,
    booked_period WITH &&
  )
  WHERE (is_blocking);

-- ----------------------------------------------------------
-- 10. Ghi chú:
--   - Khi hủy/xóa đơn thuê (RentalItem.is_blocking := false), dòng đó
--     tự động thoát khỏi phạm vi exclusion constraint vì có mệnh đề WHERE.
--   - Khi sửa pickup_at/return_due_at/returned_at, trigger ở mục 9 sẽ
--     tự cập nhật booked_period cho MỌI rental_items của đơn đó, và
--     exclusion constraint sẽ tự kiểm tra lại — nếu vi phạm, transaction
--     bị rollback với lỗi Postgres (ứng dụng cần bắt lỗi 23P01).
--   - Prisma Client không thao tác trực tiếp được cột `booked_period`
--     (kiểu Unsupported). Đọc booked_period nếu cần dùng
--     `prisma.$queryRaw` / `$queryRawUnsafe`.
-- ----------------------------------------------------------
