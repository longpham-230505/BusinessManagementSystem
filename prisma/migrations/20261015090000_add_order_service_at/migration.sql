-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "service_at" TIMESTAMPTZ;

-- Đơn bán phim / in ảnh đã tạo trước đây chưa có thời điểm phục vụ:
-- dùng tạm ngày tạo đơn (order_date) để chúng vẫn có mốc sắp xếp hợp lý.
UPDATE "orders"
SET "service_at" = "order_date"
WHERE "order_type" IN ('FILM_SALE', 'PHOTO_PRINT')
  AND "service_at" IS NULL;

COMMENT ON COLUMN "orders"."service_at" IS 'Thời điểm đơn bán phim / in ảnh phải được phục vụ (giao/nhận). Đơn thuê máy để NULL: dùng rental_details.pickup_at.';
