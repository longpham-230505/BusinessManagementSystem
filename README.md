# A Business Management System (ABMS)

Internal Operations Management Platform for Business A — **Spec v2**

> Phiên bản này thay thế README cũ. Các thay đổi lớn so với v1 được tổng hợp ở mục **Changelog** cuối tài liệu.

---

## 1. Overview

ABMS là web application nội bộ thay thế quy trình quản lý thủ công bằng Excel của hộ kinh doanh A.

Hệ thống quản lý:

- Camera Rental
- Film Sales
- Photo Printing
- Inventory (máy + phim)
- Financial Tracking
- Order Management
- Multi-Branch Operations

ABMS **không** phải hệ thống bán hàng trực tuyến và không phục vụ khách hàng cuối.

---

## 2. Business Context

### 2.1 Camera Rental

```text
Customer Inquiry → Camera Selection → Booking Deposit → Pickup
→ Security Deposit + CCCD → Rental Period → Return
→ Rental Payment → Deposit Refund / Forfeit
```

### 2.2 Film Sales

```text
Film Import → Inventory → Customer Order → Payment → Shipping/Pickup → Completed
```

### 2.3 Photo Printing

```text
Receive Request → Print → Payment → Shipping/Pickup → Completed
```

---

## 3. Product Philosophy

### Event Driven Operation
Người dùng chỉ ghi nhận sự kiện (tạo đơn, nhận cọc, giao máy, trả máy, nhập phim, chuyển cơ sở, hoàn tất đơn...). Hệ thống tự cập nhật doanh thu, chi phí, lợi nhuận, tồn kho, trạng thái máy và dòng tiền.

### Single Source of Truth
Đơn hàng là nguồn dữ liệu chính. Mọi báo cáo được **suy ra** từ dữ liệu đơn hàng, không nhập tay. Vì vậy:

- Không lưu tổng tiền đơn hàng; tính từ các dòng (dùng view).
- Không lưu trạng thái "đang thuê / đã đặt" của máy; suy ra từ đơn thuê.

### High Flexibility
- Mọi dữ liệu đều có thể chỉnh sửa.
- Không approval workflow, không role hierarchy.
- Hệ thống chỉ **cảnh báo** (warning) ở hầu hết tình huống; chỉ **chặn** ở 3 trường hợp: double booking, bán vượt tồn kho, máy đã RETIRED.
- Frontend chạy tốt trên máy tính và điện thoại (responsive).

---

## 4. Tech Stack & Deployment

| Layer | Lựa chọn |
|---|---|
| Frontend + Backend | Next.js (full-stack, TypeScript) |
| ORM / Migration | Prisma |
| Database | PostgreSQL (Neon free tier) — cần extension `btree_gist` |
| Hosting | Netlify hoặc Cloudflare (kiểm tra điều khoản thương mại của gói free trước khi chọn) |
| Backup | GitHub Actions chạy `pg_dump` định kỳ, lưu ra ngoài nhà cung cấp DB |

Quy tắc kỹ thuật chung:

- **Tiền tệ:** VND, không số lẻ, dùng `NUMERIC(14,0)`.
- **Thời gian:** lưu `TIMESTAMPTZ` (UTC), hiển thị theo `Asia/Ho_Chi_Minh`.
- **Định dạng số/ngày:** kiểu Việt Nam (1.000.000 ₫, dd/MM/yyyy).
- **Giữ Postgres chuẩn**, tránh phụ thuộc tính năng riêng của nhà cung cấp để dễ chuyển nhà bằng `pg_dump`.

---

## 5. User Management

Chỉ có **2 tài khoản nội bộ**, tạo thủ công bằng script/SQL. Không registration, invitation, tạo user từ UI, hay permission.

### Users

| Field | Type |
|---|---|
| id | UUID |
| email | VARCHAR (unique) |
| password_hash | VARCHAR (argon2id hoặc bcrypt) |
| display_name | VARCHAR |
| is_active | BOOLEAN |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

Bảo mật:

- Email + password, session cookie `HttpOnly` + `Secure`.
- Rate limit đăng nhập.
- Chỉ chạy qua HTTPS.
- Đổi mật khẩu bằng script (không có UI reset).

---

## 6. Branch Management

Mọi máy đều thuộc một cơ sở tại một thời điểm. **Phim là một kho chung** cho tất cả cơ sở (không theo dõi phim theo cơ sở).

### Branches

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| address | TEXT |
| notes | TEXT |
| created_at | TIMESTAMPTZ |
| deleted_at | TIMESTAMPTZ NULL |

---

## 7. Camera Domain

### 7.1 CameraModels

Đại diện một dòng máy (Instax Mini 12, Mini Evo, Wide 300...). Giá thuê nằm ở **từng máy** (CameraInstances); model chỉ giữ giá mặc định để điền sẵn khi thêm máy mới.

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| default_booking_deposit | NUMERIC(14,0) — mặc định 40.000 |
| default_price_1day | NUMERIC(14,0) — chỉ để điền sẵn |
| default_price_combo3 | NUMERIC(14,0) — chỉ để điền sẵn |
| active | BOOLEAN |
| created_at / updated_at | TIMESTAMPTZ |
| deleted_at | TIMESTAMPTZ NULL |

### 7.2 CameraInstances

Mỗi máy vật lý là một bản ghi riêng.

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| camera_model_id | UUID | |
| asset_code | VARCHAR | unique (partial: `deleted_at IS NULL`) |
| branch_id | UUID | Cơ sở hiện tại của máy |
| price_1day | NUMERIC(14,0) | Giá thuê 1 ngày của máy này |
| price_combo3 | NUMERIC(14,0) | Giá combo 3 ngày của máy này |
| film_remaining | INTEGER | Admin chỉnh tay |
| status | ENUM | `IN_SERVICE`, `MAINTENANCE`, `RETIRED` |
| purchase_cost | NUMERIC(14,0) NULL | Phục vụ ROI/utilization sau này |
| purchase_date | DATE NULL | |
| notes | TEXT | |
| active | BOOLEAN | |
| version | INTEGER | Optimistic locking |
| created_at / updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ NULL | |

**Trạng thái máy:**

- Chỉ **lưu** 3 trạng thái thủ công: `IN_SERVICE`, `MAINTENANCE`, `RETIRED`.
- Trạng thái vận hành **suy ra** từ đơn thuê: `AVAILABLE`, `RESERVED` (đã có đơn tương lai), `RENTED` (đang trong đơn RENTING).
- Đặt máy `MAINTENANCE` → cảnh báo nhưng cho phép. Đặt máy `RETIRED` → chặn.

> `purchase_cost` chỉ để phân tích sau này, **không** tự động tính vào chi phí/lợi nhuận. Nếu muốn ghi chi phí mua máy vào báo cáo, nhập thêm vào `OtherTransactions`.

### 7.3 CameraMovements

Lịch sử di chuyển giữa các cơ sở. Tạo movement sẽ cập nhật `CameraInstances.branch_id` trong cùng transaction.

| Field | Type |
|---|---|
| id | UUID |
| camera_instance_id | UUID |
| from_branch_id | UUID |
| to_branch_id | UUID |
| order_id | UUID NULL — nếu phát sinh từ một đơn thuê |
| moved_at | TIMESTAMPTZ |
| notes | TEXT |
| created_at | TIMESTAMPTZ |

---

## 8. Film Inventory Domain

Toàn bộ tồn kho phim là **một bể chung** cho mọi cơ sở, quản lý theo lô và FIFO.

### 8.1 FilmTypes

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| default_sale_price | NUMERIC(14,0) |
| active | BOOLEAN |
| deleted_at | TIMESTAMPTZ NULL |

### 8.2 FilmBatches

Mỗi lần nhập kho tạo một batch. Không còn `branch_id`.

| Field | Type |
|---|---|
| id | UUID |
| film_type_id | UUID |
| quantity_original | INTEGER |
| quantity_remaining | INTEGER (CHECK ≥ 0) |
| unit_cost | NUMERIC(14,0) |
| received_date | DATE |
| notes | TEXT |
| version | INTEGER |
| created_at / updated_at | TIMESTAMPTZ |
| deleted_at | TIMESTAMPTZ NULL |

### 8.3 FilmStockAdjustments

Kiểm kê, hao hụt, hư hỏng. Điều chỉnh giảm được tính là **chi phí** theo giá vốn của batch.

| Field | Type |
|---|---|
| id | UUID |
| film_batch_id | UUID |
| quantity_delta | INTEGER (âm = hao hụt, dương = tìm thấy thêm) |
| reason | TEXT |
| adjusted_at | TIMESTAMPTZ |

### 8.4 FIFO Rules

Ví dụ: Batch A 20 @ 180.000, Batch B 30 @ 195.000; khách mua 25 → giá vốn = 20×180.000 + 5×195.000.

Áp dụng **như nhau** cho cả `FilmSaleItems` (bán phim) và `PhotoPrintItems` có `film_quantity` (in ảnh dùng phim), vì cùng tiêu thụ chung một bể tồn kho.

1. **Phân bổ khi tạo/sửa đơn** (không đợi hoàn tất): dùng để giữ hàng và chặn bán/dùng vượt tồn.
2. Lấy batch theo `received_date ASC, id ASC`, khóa dòng bằng `SELECT ... FOR UPDATE` trong transaction.
3. Tổng tồn của loại phim (cả hệ thống) < số lượng yêu cầu → **chặn**.
4. **Sửa đơn** hoặc **hủy/xóa đơn** (dù là đơn phim hay đơn in ảnh): giải phóng toàn bộ consumption cũ (trả lại `quantity_remaining`), rồi phân bổ lại từ tồn kho hiện tại. Không tính lại giá vốn của các đơn khác đã phân bổ trước đó.
5. **Ghi nhận giá vốn (COGS)** vào báo cáo tại thời điểm đơn `COMPLETED`, cùng kỳ với doanh thu — dù COGS đó đến từ đơn bán phim hay đơn in ảnh.

---

## 9. Photo Printing Domain

Photo printing là dịch vụ, nhưng **có thể tiêu thụ phim từ kho chung** (ví dụ in ảnh Polaroid/Instax dùng phim của cửa hàng). Việc tiêu thụ này được ghi ở cấp từng dòng `PhotoPrintItems` (mục 11.7) theo đúng FIFO (mục 8.4), để đơn in ảnh cũng cập nhật tồn kho phim như đơn bán phim.

### PrintServices

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| unit_price | NUMERIC(14,0) |
| active | BOOLEAN |
| deleted_at | TIMESTAMPTZ NULL |

Chi phí in ảnh (nếu có) ghi tay qua `OtherTransactions` (có thể gắn `order_id`).

---

## 10. Customers

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| phone | VARCHAR (index, **không** unique; cảnh báo khi trùng) |
| contact_channel | VARCHAR (Facebook, Instagram, Zalo, TikTok, Other...) |
| contact_handle | VARCHAR |
| is_flagged | BOOLEAN — đánh dấu khách cần lưu ý |
| notes | TEXT |
| created_at / updated_at | TIMESTAMPTZ |
| deleted_at | TIMESTAMPTZ NULL |

---

## 11. Order Management (thiết kế lại)

Mỗi đơn có **đúng một loại** (`RENTAL`, `FILM_SALE`, `PHOTO_PRINT`) và **nhiều dòng** thuộc loại đó. Bảng `Orders` chứa các trường chung; phần đặc thù nằm trong bảng con.

### 11.1 Orders

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| order_code | VARCHAR | unique; ví dụ `RNT-260929-001`, `FLM-...`, `PRT-...` (prefix theo loại + ngày + số thứ tự trong ngày) |
| order_type | ENUM | `RENTAL`, `FILM_SALE`, `PHOTO_PRINT` |
| status | ENUM | Xem 11.2 |
| customer_id | UUID | |
| branch_id | UUID | Cơ sở phụ trách (với thuê máy: cơ sở giao máy) |
| order_date | TIMESTAMPTZ | Ngày lập đơn |
| shipping_fee | NUMERIC(14,0) | Mặc định 0. Chỉ ghi nhận, **không** tính thu nhập/chi phí |
| discount_amount | NUMERIC(14,0) | Mặc định 0. Số tiền cố định, nhập tay, tối đa 1 khoản mỗi đơn |
| surcharge_amount | NUMERIC(14,0) | Mặc định 0. Phụ thu (trễ hạn, hư hỏng...) — tính vào doanh thu |
| surcharge_note | TEXT | |
| notes | TEXT | |
| completed_at | TIMESTAMPTZ NULL | Thời điểm ghi nhận doanh thu |
| cancelled_at | TIMESTAMPTZ NULL | |
| version | INTEGER | Optimistic locking |
| created_at / updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ NULL | |

Công thức (suy ra, không lưu):

```text
subtotal      = Σ giá các dòng
order_revenue = subtotal - discount_amount + surcharge_amount     (không gồm shipping_fee)
amount_due    = order_revenue + shipping_fee                       (số khách cần trả)
```

Ràng buộc: `discount_amount ≤ subtotal`.

### 11.2 Order Status

Trạng thái lưu trực tiếp trong `Orders.status`. Hệ thống gợi ý bước kế tiếp nhưng **không ép** đúng thứ tự (đúng triết lý flexible).

**RENTAL**

```text
PENDING_BOOKING_DEPOSIT → BOOKED → RENTING → RETURNED → COMPLETED
                                     ↘ CANCELLED (từ bất kỳ trạng thái trước RENTING)
```

| Status | Ý nghĩa |
|---|---|
| PENDING_BOOKING_DEPOSIT | Đã tạo đơn, chưa nhận cọc giữ chỗ |
| BOOKED | Đã nhận cọc, chờ giao máy |
| RENTING | Đã giao máy |
| RETURNED | Máy đã về, chưa xong thanh toán/xử lý cọc |
| COMPLETED | Đã thu tiền thuê và xử lý xong cọc |
| CANCELLED | Hủy đơn |

`OVERDUE` **không phải trạng thái lưu**: đơn `RENTING` mà `return_due_at < now` được hiển thị là quá hạn.

**FILM_SALE / PHOTO_PRINT**

```text
PENDING → PAID → DELIVERING → COMPLETED        (CANCELLED bất kỳ lúc nào)
```

Cho phép bỏ qua bước (ví dụ khách nhận tại chỗ, bỏ `DELIVERING`; hoặc COD).

Khi chuyển sang `COMPLETED`: ghi `completed_at`; nếu còn thiếu tiền thì **cảnh báo** (vẫn cho hoàn tất). Chuyển ngược khỏi `COMPLETED` thì xóa `completed_at`.

### 11.3 RentalDetails (1–1 với Orders loại RENTAL)

Một đơn thuê có **một khoảng thời gian chung** cho tất cả máy. Nếu cần thời gian khác nhau, tạo đơn riêng.

| Field | Type |
|---|---|
| order_id | UUID (PK, FK) |
| pickup_at | TIMESTAMPTZ |
| return_due_at | TIMESTAMPTZ |
| returned_at | TIMESTAMPTZ NULL |
| rental_days | INTEGER — tự tính từ pickup/due, làm tròn lên theo 24h, cho phép sửa |
| return_branch_id | UUID NULL — cơ sở nhận máy trả về (mặc định = `Orders.branch_id`) |
| id_card_received_at | TIMESTAMPTZ NULL |
| id_card_returned_at | TIMESTAMPTZ NULL |

**Không lưu ảnh CCCD.** Chỉ theo dõi đã nhận / đã trả lại.

### 11.4 RentalItems (mỗi dòng = một máy)

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| order_id | UUID | |
| camera_instance_id | UUID | |
| unit_price_1day | NUMERIC(14,0) | Snapshot giá tại lúc lập đơn |
| unit_price_combo3 | NUMERIC(14,0) | Snapshot |
| combo3_count | INTEGER | Số combo 3 ngày |
| single_day_count | INTEGER | Số gói 1 ngày |
| rental_fee | NUMERIC(14,0) | Mặc định = công thức bên dưới, **cho phép sửa tay** |
| other_cost | NUMERIC(14,0) | "Chi phí khác": pin, phim cho máy... Mặc định 0. Tính vào chi phí |
| other_cost_note | TEXT | |
| booked_period | TSTZRANGE | `[pickup_at, COALESCE(returned_at, return_due_at))`, đồng bộ từ RentalDetails |
| is_blocking | BOOLEAN | false khi đơn bị hủy/xóa |

**Công thức giá thuê (hard-code 2 gói):**

```text
combo3_count     = floor(rental_days / 3)
single_day_count = rental_days mod 3
rental_fee       = combo3_count × price_combo3 + single_day_count × price_1day
```

Ví dụ: 5 ngày = 1 combo + 2 gói 1 ngày; 7 ngày = 2 combo + 1 gói 1 ngày.

> Lưu ý: khi thuê 2 ngày, giá có thể cao hơn combo 3 ngày nếu `2 × price_1day > price_combo3`. Hệ thống áp dụng đúng công thức trên; người dùng có thể sửa `rental_fee` tay nếu muốn.

**Chống double booking (bắt buộc ở tầng database):**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE rental_items
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (camera_instance_id WITH =, booked_period WITH &&)
  WHERE (is_blocking);
```

Khi máy quá hạn nhưng chưa trả, hệ thống coi máy vẫn đang bị chiếm cho đến khi ghi nhận trả (kiểm tra thêm ở tầng ứng dụng khi kiểm tra lịch).

**Cross-branch validation:** nếu tại thời điểm giao, `CameraInstances.branch_id ≠ Orders.branch_id` → hiển thị **"Camera Transfer Required"** cho dòng đó nhưng vẫn cho tạo/giao đơn.

**Khi trả máy** về cơ sở khác cơ sở hiện tại của máy → tự tạo `CameraMovements` (gắn `order_id`) và cập nhật `branch_id` của máy.

### 11.5 FilmSaleItems (mỗi dòng = một loại phim)

| Field | Type |
|---|---|
| id | UUID |
| order_id | UUID |
| film_type_id | UUID |
| quantity | INTEGER (> 0) |
| sale_price | NUMERIC(14,0) — snapshot, mặc định từ `default_sale_price`, cho phép sửa |

### 11.6 FilmBatchConsumptions

Ghi nhận batch phim nào đã bị tiêu thụ bởi **một dòng đơn phim hoặc một dòng đơn in ảnh** (dùng chung một bảng vì cùng một bể tồn kho, cùng một quy tắc FIFO).

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| film_sale_item_id | UUID NULL | Set nếu tiêu thụ từ `FilmSaleItems` |
| photo_print_item_id | UUID NULL | Set nếu tiêu thụ từ `PhotoPrintItems` |
| film_batch_id | UUID | |
| quantity | INTEGER | |
| unit_cost | NUMERIC(14,0) | Snapshot giá vốn của batch |

Ràng buộc: đúng một trong hai cột `film_sale_item_id` / `photo_print_item_id` được set (CHECK).

### 11.7 PhotoPrintItems

In ảnh tiêu thụ phim, nên mỗi dòng in **có thể** gắn với một loại phim và số lượng phim dùng (không bắt buộc — một số dịch vụ in không dùng phim của cửa hàng, ví dụ khách gửi ảnh in giấy thường).

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| order_id | UUID | |
| print_service_id | UUID | |
| quantity | INTEGER | Số lượng ảnh in |
| unit_price | NUMERIC(14,0) | Snapshot, cho phép sửa |
| film_type_id | UUID NULL | Loại phim tiêu thụ, nếu có |
| film_quantity | INTEGER NULL | Số lượng phim tiêu thụ; bắt buộc nếu có `film_type_id` |

Ràng buộc: `film_quantity IS NOT NULL ⟺ film_type_id IS NOT NULL`, và `film_quantity > 0`.

---

## 12. Deposits (thiết kế lại)

Cả **booking deposit** và **security deposit** đều **không trừ vào tiền thuê**: khách trả đủ tiền thuê, doanh nghiệp hoàn hoặc giữ cọc tùy tình huống. Cọc **không phải doanh thu**.

### 12.1 Deposits

Mỗi đơn có tối đa 1 booking deposit và 1 security deposit.

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| order_id | UUID | |
| kind | ENUM | `BOOKING`, `SECURITY_CASH`, `SECURITY_ITEM`, `SECURITY_NONE` |
| amount_received | NUMERIC(14,0) | Với `SECURITY_ITEM`/`SECURITY_NONE` = 0 |
| amount_refunded | NUMERIC(14,0) | Tổng đã hoàn (từ Payments) |
| amount_forfeited | NUMERIC(14,0) | Phần doanh nghiệp giữ lại |
| item_description | TEXT NULL | Ví dụ "iPhone 13 Black" |
| item_returned_at | TIMESTAMPTZ NULL | Đã trả lại tài sản cọc |
| received_at | TIMESTAMPTZ | |
| resolved_at | TIMESTAMPTZ NULL | Khi cọc được xử lý xong |
| resolution_note | TEXT | Lý do giữ/hoàn (ví dụ "khách hủy sát ngày", "hư máy") |

**Trạng thái cọc** (suy ra): `HELD` (chưa xử lý), `RESOLVED` (đã xử lý).

Quy tắc:

- Người dùng nhập tay số tiền hoàn và số tiền giữ; cho phép hoàn một phần: `amount_refunded + amount_forfeited ≤ amount_received`.
- Cọc `SECURITY_ITEM` ⇒ `amount_received = 0`.
- Ghi nhận `SECURITY_NONE` một cách tường minh để phân biệt "cố ý không cọc" với "quên nhận cọc".
- Số tiền giữ lại (`amount_forfeited`) được tính là **Thu nhập từ cọc bị giữ** tại `resolved_at`, hiển thị thành một dòng riêng trong báo cáo tài chính.

---

## 13. Payments & Cash Flow

`Payments` ghi nhận **mọi dòng tiền thực tế** của đơn hàng. Dùng cho dòng tiền, không phải nguồn tính doanh thu.

| Field | Type |
|---|---|
| id | UUID |
| order_id | UUID |
| deposit_id | UUID NULL |
| payment_type | ENUM |
| direction | ENUM (`IN`, `OUT`) |
| amount | NUMERIC(14,0) |
| payment_method | ENUM (`CASH`, `BANK_TRANSFER`, `OTHER`) |
| payment_date | TIMESTAMPTZ |
| notes | TEXT |
| deleted_at | TIMESTAMPTZ NULL |

| payment_type | Hướng | Ý nghĩa |
|---|---|---|
| BOOKING_DEPOSIT_RECEIVED | IN | Nhận cọc giữ chỗ |
| BOOKING_DEPOSIT_REFUNDED | OUT | Hoàn cọc giữ chỗ |
| SECURITY_DEPOSIT_RECEIVED | IN | Nhận cọc tiền mặt |
| SECURITY_DEPOSIT_REFUNDED | OUT | Hoàn cọc tiền mặt |
| ORDER_PAYMENT | IN | Khách trả tiền đơn (thuê / phim / in ảnh), cho phép trả nhiều lần |
| ORDER_REFUND | OUT | Hoàn tiền đơn (ví dụ hủy đơn phim đã thanh toán) |
| SHIPPING_FEE_RECEIVED | IN | Nhận tiền ship từ khách |
| SHIPPING_FEE_PAID | OUT | Trả tiền ship cho đơn vị vận chuyển |

Tiền ship: vào `Payments` để đối chiếu dòng tiền nhưng **không** đi vào doanh thu/chi phí.

Trạng thái thanh toán của đơn (suy ra): `UNPAID` / `PARTIALLY_PAID` / `PAID` so sánh `Σ ORDER_PAYMENT − Σ ORDER_REFUND` với `amount_due − shipping_fee`.

---

## 14. Financial System

### 14.1 Nguyên tắc ghi nhận

- **Doanh thu ghi nhận theo đơn hoàn tất**, tính theo `Orders.completed_at`.
- Cọc, tiền ship và các khoản chưa hoàn tất không nằm trong doanh thu.

### 14.2 Công thức

```text
Revenue        = Σ order_revenue của các đơn COMPLETED trong kỳ
                 (gồm cả phụ thu, đã trừ discount, không gồm shipping)

Other Income   = Σ OtherTransactions loại INCOME
               + Σ amount_forfeited của cọc được xử lý trong kỳ

Expense        = Film COGS (Σ FilmBatchConsumptions của đơn COMPLETED — cả đơn bán phim và đơn in ảnh)
               + Rental other_cost (Σ RentalItems.other_cost của đơn COMPLETED)
               + Film write-off (Σ điều chỉnh âm × unit_cost)
               + Σ OtherTransactions loại EXPENSE

Profit         = Revenue + Other Income − Expense
```

Báo cáo có thể lọc theo kỳ, cơ sở (`Orders.branch_id`), loại đơn.

### 14.3 OtherTransactions

Các thu/chi không thuộc đơn hàng (mặt bằng, quảng cáo, bảo trì máy, mua máy, lương...).

| Field | Type |
|---|---|
| id | UUID |
| branch_id | UUID NULL — NULL = chi phí chung |
| order_id | UUID NULL — nếu liên quan đến một đơn |
| category_id | UUID |
| transaction_type | ENUM (`INCOME`, `EXPENSE`) |
| amount | NUMERIC(14,0) |
| description | TEXT |
| transaction_date | TIMESTAMPTZ |
| deleted_at | TIMESTAMPTZ NULL |

### TransactionCategories

Danh mục người dùng tự quản lý được.

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| transaction_type | ENUM (`INCOME`, `EXPENSE`) |
| active | BOOLEAN |

Gợi ý danh mục ban đầu: Mặt bằng, Quảng cáo, Bảo trì máy, Mua máy/thiết bị, Vật tư, Lương, Khác.

---

## 15. Event → Effect

| Sự kiện | Hệ thống tự động |
|---|---|
| Tạo/sửa đơn thuê | Tính `rental_days`, combo, `rental_fee`; kiểm tra double booking (chặn); cảnh báo cross-branch/máy bảo trì |
| Nhận cọc | Tạo `Deposits` + `Payments` (IN); có thể chuyển `PENDING_BOOKING_DEPOSIT → BOOKED` |
| Giao máy | Đơn → `RENTING`; ghi nhận `id_card_received_at` và cọc bảo đảm; cảnh báo nếu thiếu |
| Trả máy | Đơn → `RETURNED`; ghi `returned_at`, cập nhật `booked_period`; tự tạo `CameraMovements` nếu trả khác cơ sở |
| Xử lý cọc | Ghi `amount_refunded` / `amount_forfeited`; tạo `Payments` (OUT) cho phần hoàn |
| Tạo/sửa đơn phim | Phân bổ FIFO, tạo `FilmBatchConsumptions`; chặn nếu vượt tồn |
| Tạo/sửa đơn in ảnh có dùng phim | Phân bổ FIFO như đơn bán phim (theo `film_type_id`/`film_quantity` của dòng in); chặn nếu vượt tồn |
| Hủy/xóa đơn (phim hoặc in ảnh) | Giải phóng tồn phim đã phân bổ, ngừng chặn lịch máy nếu là đơn thuê (`is_blocking = false`) |
| Hoàn tất đơn | Ghi `completed_at`; doanh thu, giá vốn, `other_cost` vào báo cáo kỳ đó |
| Nhập phim | Tạo `FilmBatches` |
| Chuyển cơ sở (máy) | Tạo `CameraMovements`; cập nhật `branch_id` |

---

## 16. Audit System

Ghi lại mọi **tạo / sửa / xóa / khôi phục / đổi trạng thái** trên các entity chính (Orders và các dòng, Payments, Deposits, CameraInstances, CameraMovements, FilmBatches, FilmStockAdjustments, OtherTransactions, Customers, giá và danh mục). Dữ liệu ít nên giữ vĩnh viễn.

### AuditLogs

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| entity_type | VARCHAR |
| entity_id | UUID |
| action | ENUM (`CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `STATUS_CHANGE`) |
| old_value | JSONB |
| new_value | JSONB |
| created_at | TIMESTAMPTZ |

Audit được ghi ở tầng service, trong cùng transaction với thay đổi dữ liệu.

---

## 17. Soft Delete & Concurrency

- Mọi entity chính có `deleted_at TIMESTAMPTZ NULL`; báo cáo và danh sách mặc định loại trừ bản ghi đã xóa.
- Unique constraint (`asset_code`, `order_code`...) dùng **partial unique index** `WHERE deleted_at IS NULL`.
- Xóa đơn (soft) sẽ giải phóng tồn phim và ngừng chặn lịch máy, giống hủy đơn.
- Optimistic locking bằng cột `version` trên `Orders`, `CameraInstances`, `FilmBatches`: update kèm `WHERE version = ?`, nếu lệch thì báo "dữ liệu đã bị người khác sửa, vui lòng tải lại".

---

## 18. Dashboard

### Daily Operations

| Mục | Định nghĩa |
|---|---|
| Cameras Due For Pickup | Đơn `BOOKED` có `pickup_at` hôm nay (và quá hạn giao) |
| Cameras Due For Return | Đơn `RENTING` có `return_due_at` hôm nay |
| Overdue Orders | Đơn `RENTING` có `return_due_at < now` |
| Missing Deposits | Đơn `RENTING` chưa có bản ghi cọc bảo đảm (kể cả `SECURITY_NONE`) hoặc chưa nhận CCCD |
| Deposits Pending Resolution | Đơn `RETURNED` còn cọc `HELD` hoặc chưa trả CCCD/tài sản cọc |
| Cross-Branch Transfers Required | Đơn `BOOKED` có máy đang ở cơ sở khác cơ sở giao |

### Financial Summary

Today's Revenue, Today's Expense, Monthly Revenue, Monthly Profit (theo công thức mục 14).

### Inventory Summary

Available / Rented / Maintenance Cameras (theo cơ sở); Film Inventory By Type (tổng chung).

---

## 19. Non-Functional Requirements

- **Backup:** GitHub Actions chạy `pg_dump` mỗi ngày, lưu ra nơi khác nhà cung cấp DB (Google Drive, Cloudflare R2 hoặc repo private, mã hóa), giữ tối thiểu 30 bản; thử restore định kỳ.
- **Data migration:** viết script nhập một lần từ Excel hiện tại (khách hàng, máy, lô phim, đơn đang mở) qua CSV; chạy thử trên bản sao trước.
- **Hiệu năng:** dữ liệu nhỏ, dưới 5 người dùng đồng thời; không cần cache hay queue.
- **Cold start:** database serverless có thể chậm ở lần truy cập đầu sau thời gian rảnh; chấp nhận được.
- **Responsive:** mọi màn hình chính dùng được trên điện thoại (tạo đơn, ghi nhận giao/trả máy, xem dashboard).

---

## 20. Business Rules Summary

**Camera Rental**
✅ Cho phép chỉnh sửa đơn, máy, giá
✅ Một đơn thuê nhiều máy, chung một khoảng thời gian
✅ Tự động kiểm tra lịch
✅ Cảnh báo cross-branch, máy bảo trì
❌ Không cho phép double booking (ràng buộc ở database)
❌ Không cho phép thuê máy `RETIRED`

**Film Sales & Photo Printing (dùng phim)**
✅ FIFO, theo dõi giá vốn nhiều batch, kho chung hai cơ sở
✅ Một đơn nhiều loại phim (bán phim) hoặc gắn 1 loại phim/dòng in (in ảnh)
✅ Đơn in ảnh dùng phim cũng cập nhật tồn kho như đơn bán phim
❌ Không cho phép bán/dùng vượt tồn

**Deposits**
✅ Cọc tiền / cọc tài sản / không cọc
✅ Hoàn hoặc giữ tùy tình huống, có ghi lý do
✅ Không lưu ảnh CCCD
❌ Cọc không trừ vào tiền thuê và không phải doanh thu

**Finance**
✅ Doanh thu ghi nhận khi đơn hoàn tất
✅ Discount là số tiền cố định, nhập tay, 1 khoản/đơn
❌ Tiền ship không tính thu nhập hay chi phí

---

## 21. Future Roadmap

Kiến trúc cần đủ linh hoạt để hỗ trợ:

- Additional Branches
- Advanced Reporting
- Revenue Analytics
- Customer Insights (dựa trên `contact_channel`)
- Camera Utilization Tracking & ROI (dựa trên `purchase_cost`, `booked_period`)
- Inventory Forecasting
- Financial Export
- Khấu hao máy (nếu cần tính vào lợi nhuận)

---

## 22. Vision

ABMS là một Operational ERP tối giản cho hộ kinh doanh nhỏ: mọi hoạt động được ghi nhận dưới dạng đơn hàng, và mọi báo cáo, tồn kho, lịch thuê, doanh thu, lợi nhuận đều được cập nhật tự động.

---

## Changelog so với v1

| Nội dung | Thay đổi |
|---|---|
| Đơn hàng | Bỏ `RentalOrders`, `FilmSaleOrders`, `PhotoPrintOrders`. Thay bằng `Orders` chung + `status`, `completed_at`; `RentalDetails` (1–1) cho thuê máy; các bảng dòng riêng cho từng loại (hỗ trợ nhiều máy/nhiều loại phim) |
| Trạng thái đơn | Thêm `status` cho cả 3 loại đơn; gộp `BOOKING_DEPOSIT_RECEIVED` và `WAITING_PICKUP` thành `BOOKED`; `OVERDUE` thành trạng thái suy ra |
| Giá thuê | Bỏ `RentalRates`, `Discounts`; giá nằm ở từng máy (`price_1day`, `price_combo3`), công thức combo hard-code |
| Discount | Số tiền cố định, nhập tay mỗi đơn, mặc định 0 |
| Shipping | Ghi nhận trên đơn nhưng không tính thu nhập/chi phí; thêm 2 loại payment để đối chiếu dòng tiền |
| Cọc | Gộp `RentalDeposits` + `RentalIdentityRecords` thành `Deposits` (+ CCCD trong `RentalDetails`); hỗ trợ hoàn/giữ từng phần |
| Camera status | Chỉ lưu `IN_SERVICE/MAINTENANCE/RETIRED`; `RESERVED/RENTED` suy ra từ đơn |
| Phim | Bỏ `branch_id` của lô (kho chung); thêm `FilmStockAdjustments`; quy tắc FIFO khi sửa/hủy đơn |
| Thu chi | Thêm `TransactionCategories`, `INCOME/EXPENSE`, liên kết đơn; thêm `other_cost` cho từng máy thuê; thêm `purchase_cost` cho máy |
| Payments | Gộp `RENTAL/FILM/PRINT_PAYMENT` thành `ORDER_PAYMENT`; thêm `direction`, `payment_method` |
| Kỹ thuật | Chốt stack, `NUMERIC(14,0)`, timezone, optimistic locking, partial unique index, backup, migration Excel |
| Photo Printing | `PhotoPrintItems` thêm `film_type_id`/`film_quantity` tùy chọn; `FilmBatchConsumptions` tổng quát hóa để nhận cả từ đơn in ảnh, dùng chung FIFO với đơn bán phim |
| ORM | Đổi từ Drizzle sang Prisma |