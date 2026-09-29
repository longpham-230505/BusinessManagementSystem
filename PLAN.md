# ABMS — Kế hoạch triển khai & Kiến trúc hệ thống

Tài liệu này dành cho vai trò của bạn: **kiểm soát kiến trúc và thử nghiệm (UAT)**. Claude sẽ đảm nhiệm phần code chính. Tài liệu gồm 3 phần:

1. Kiến trúc codebase
2. Lộ trình implementation theo từng giai đoạn (có tiêu chí nghiệm thu để bạn kiểm tra)
3. Hướng dẫn tích hợp các dịch vụ ngoài (Neon, GitHub, Netlify/Cloudflare, GitHub Actions)

> Nguồn thiết kế: `README.md` (spec v2), `schema.prisma`, `manual_migration.sql` đã thống nhất ở các bước trước.

---

## 1. Kiến trúc hệ thống

### 1.1 Sơ đồ tổng quan

```text
┌─────────────────────────────────────────────────────────┐
│                   Browser (desktop/mobile)                │
└───────────────────────────┬─────────────────────────────┘
                             │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│  Next.js (App Router) — deploy trên Netlify/Cloudflare    │
│                                                             │
│  ┌───────────────┐   ┌───────────────┐   ┌─────────────┐  │
│  │  UI (React)    │→→│  Server Actions │→→│  Service    │  │
│  │  app/**/page   │   │  / Route Handlers│  │  layer      │  │
│  └───────────────┘   └───────────────┘   └──────┬──────┘  │
│                                                    │         │
│                                          ┌─────────▼──────┐ │
│                                          │  Prisma Client  │ │
│                                          └─────────┬──────┘ │
└────────────────────────────────────────────────────┼────────┘
                                                       │ TLS
                                          ┌────────────▼────────────┐
                                          │  Neon PostgreSQL (free)  │
                                          └──────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  GitHub Actions (cron)                                    │
│   - Backup: pg_dump hàng ngày → lưu ra Cloudflare R2/Drive │
└─────────────────────────────────────────────────────────┘
```

Một app duy nhất (Next.js full-stack) nói chuyện trực tiếp với Postgres qua Prisma — không có microservice, không có queue, đúng với quy mô "dưới 5 người dùng".

### 1.2 Cấu trúc thư mục

```text
abms/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20260930_init/
│   │   └── ...
│   └── seed.ts                    # tạo 2 user, branch, model máy mẫu...
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # layout có nav, chỉ vào được khi đã login
│   │   │   ├── page.tsx           # Dashboard (mục 18 spec)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx               # danh sách đơn
│   │   │   │   ├── new/page.tsx           # tạo đơn (chọn loại trước)
│   │   │   │   └── [id]/page.tsx          # chi tiết đơn, xử lý sự kiện
│   │   │   ├── cameras/
│   │   │   │   ├── page.tsx               # danh sách máy + trạng thái suy ra
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── film/
│   │   │   │   ├── batches/page.tsx       # nhập kho, tồn theo FIFO
│   │   │   │   └── adjustments/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── finance/
│   │   │   │   ├── page.tsx               # báo cáo doanh thu/chi phí/lợi nhuận
│   │   │   │   └── transactions/page.tsx  # OtherTransactions
│   │   │   └── settings/                  # models, rates, branches, categories
│   │   │
│   │   └── api/
│   │       └── ...                # chỉ dùng nếu cần REST (ví dụ webhook); ưu tiên Server Actions
│   │
│   ├── server/
│   │   ├── db.ts                  # PrismaClient singleton
│   │   ├── auth.ts                # session/cookie, kiểm tra login
│   │   └── services/              # ← LOGIC NGHIỆP VỤ NẰM Ở ĐÂY, không nằm trong UI
│   │       ├── order.service.ts           # tạo/sửa/hủy/hoàn tất đơn
│   │       ├── rental.service.ts          # tính combo, double-booking, giao/trả máy
│   │       ├── film.service.ts            # FIFO allocation/release, adjustments
│   │       ├── deposit.service.ts         # xử lý cọc, hoàn/giữ
│   │       ├── payment.service.ts         # ghi nhận thu/chi
│   │       ├── finance.service.ts         # tính revenue/expense/profit theo kỳ
│   │       ├── dashboard.service.ts       # các số liệu "Daily Operations"
│   │       └── audit.service.ts           # ghi AuditLogs, dùng chung mọi service khác
│   │
│   ├── lib/
│   │   ├── money.ts                # format/parsing VND
│   │   ├── datetime.ts             # timezone Asia/Ho_Chi_Minh
│   │   └── validation/             # Zod schema cho từng form/action
│   │
│   └── components/                 # UI dùng chung (form, table, badge trạng thái...)
│
├── scripts/
│   ├── create-user.ts              # tạo tài khoản nội bộ (không có UI)
│   ├── backup.ts                   # dùng trong GitHub Actions
│   └── import-excel.ts             # migrate dữ liệu cũ (Giai đoạn 7)
│
├── .github/workflows/
│   ├── ci.yml                      # lint, typecheck, test khi push/PR
│   └── backup.yml                  # cron pg_dump hàng ngày
│
├── .env.example
└── package.json
```

### 1.3 Nguyên tắc kiến trúc quan trọng

| Nguyên tắc | Vì sao |
|---|---|
| **Toàn bộ logic nghiệp vụ nằm trong `server/services/*`**, UI chỉ gọi service | Để bạn (kiểm soát kiến trúc) có một chỗ duy nhất đọc để hiểu "hệ thống làm gì", không phải lục trong JSX |
| **Mỗi service function chạy trong một Prisma transaction** khi động đến >1 bảng | Đảm bảo tính nhất quán (ví dụ: hoàn tất đơn phải vừa cập nhật `Order.status`, vừa ghi COGS, vừa gọi `audit.service`) |
| **Server Actions thay vì REST API riêng** | Next.js App Router hỗ trợ gọi thẳng service từ form — giảm boilerplate, phù hợp app nội bộ nhỏ |
| **Validation bằng Zod ở biên (form/action)**, business rule ở service | Tách "dữ liệu có hợp lệ không" khỏi "nghiệp vụ có cho phép không" (ví dụ double booking là business rule, không phải validation) |
| **Mọi thay đổi dữ liệu quan trọng đi qua `audit.service`** | Khớp mục 16 của spec, và giúp bạn debug khi thử nghiệm ("tại sao số liệu này ra vậy") |

---

## 2. Lộ trình Implementation

Mỗi giai đoạn có **input** (cái cần có trước), **output** (cái Claude sẽ giao), và **tiêu chí nghiệm thu** (cái bạn kiểm tra trước khi qua giai đoạn kế). Đi tuần tự — không nên nhảy cóc vì các giai đoạn sau phụ thuộc dữ liệu/luồng của giai đoạn trước.

### Giai đoạn 0 — Khởi tạo hạ tầng
**Mục tiêu:** có một app "Hello World" chạy được, kết nối được database thật, deploy được lên internet.

- Tạo repo GitHub.
- Tạo project Neon (mục 3.1).
- Khởi tạo Next.js + Prisma, chạy migration đầu tiên (schema đã có sẵn).
- Deploy lên Netlify/Cloudflare, gắn biến môi trường `DATABASE_URL` (mục 3.2).
- Tạo 2 user nội bộ bằng script.

**Nghiệm thu:** bạn truy cập được URL public, đăng nhập bằng 1 trong 2 tài khoản, thấy trang dashboard trống.

### Giai đoạn 1 — Master data (dữ liệu nền)
**Mục tiêu:** nhập được toàn bộ dữ liệu "tĩnh" mà các giai đoạn sau phụ thuộc vào.

- CRUD: Branches, CameraModels, CameraInstances, FilmTypes, PrintServices, TransactionCategories, Customers.
- Áp dụng `manual_migration.sql` (extension, CHECK, partial unique index — **trừ** phần exclusion constraint và trigger `booked_period`, để dành cho Giai đoạn 2 vì cần bảng `rental_items` có dữ liệu để test).

**Nghiệm thu:** bạn tự nhập được 2 cơ sở, vài model máy, vài máy cụ thể, vài loại phim, vài dịch vụ in, vài khách hàng — không cần code, chỉ qua UI.

### Giai đoạn 2 — Rental Order (mảng phức tạp nhất, làm trước)
**Mục tiêu:** toàn bộ vòng đời một đơn thuê máy.

- Tạo đơn thuê (chọn khách, cơ sở, nhiều máy, khoảng thời gian) → tự tính combo/`rental_fee` theo công thức hard-code.
- Áp dụng exclusion constraint + trigger `booked_period` (phần còn lại của `manual_migration.sql`).
- Luồng trạng thái: `PENDING_BOOKING_DEPOSIT → BOOKED → RENTING → RETURNED → COMPLETED`, cộng `CANCELLED`.
- Nhận/xử lý booking deposit và security deposit (cash/item/none), hoàn hoặc giữ từng phần.
- Giao máy, trả máy (kèm cross-branch warning, tự tạo `CameraMovements` nếu trả khác cơ sở).
- Cảnh báo double booking, máy `MAINTENANCE`; chặn khi `RETIRED` hoặc thật sự trùng lịch.

**Nghiệm thu (kịch bản thử nghiệm gợi ý):**
1. Tạo đơn thuê 2 máy, 5 ngày → kiểm tra `rental_fee` = đúng công thức combo.
2. Thử tạo đơn thuê trùng máy, trùng thời gian → phải bị chặn với thông báo rõ ràng.
3. Trả máy về cơ sở khác → kiểm tra `CameraMovements` tự sinh và `branch_id` của máy cập nhật đúng.
4. Hoàn tất đơn, xử lý cọc giữ một phần → kiểm tra `Deposit.amountForfeited` và dashboard tài chính phản ánh đúng.

### Giai đoạn 3 — Film Sale & Photo Printing (FIFO)
**Mục tiêu:** đơn bán phim và đơn in ảnh, cùng chia sẻ engine FIFO.

- Tạo đơn bán phim (nhiều loại phim) → phân bổ FIFO, chặn vượt tồn.
- Tạo đơn in ảnh, tùy chọn gắn loại phim + số lượng tiêu thụ → dùng chung engine FIFO ở trên.
- Sửa/hủy đơn → giải phóng và phân bổ lại đúng theo mục 8.4 của spec.
- Nhập kho phim (FilmBatches) và điều chỉnh tồn kho (FilmStockAdjustments).

**Nghiệm thu:**
1. Nhập 2 batch phim giá khác nhau → bán số lượng cắt qua cả 2 batch → kiểm tra giá vốn tính đúng ví dụ trong spec (20×180.000 + 5×195.000).
2. Sửa một đơn phim đã tạo (đổi số lượng) → kiểm tra tồn kho được giải phóng và phân bổ lại đúng, không lệch.
3. Thử bán vượt tồn → phải bị chặn.
4. Tạo đơn in ảnh có tiêu thụ phim → kiểm tra tồn kho phim giảm giống hệt logic đơn bán phim.

### Giai đoạn 4 — Payments & Cash Flow
**Mục tiêu:** ghi nhận dòng tiền thực tế, tách bạch với doanh thu kế toán.

- Ghi nhận `Payments` cho từng loại (booking deposit, security deposit, order payment, refund, shipping).
- Trạng thái thanh toán đơn (UNPAID/PARTIALLY_PAID/PAID) suy ra từ Payments.
- Xác nhận shipping fee không đi vào doanh thu/chi phí, chỉ đối chiếu dòng tiền.

**Nghiệm thu:** một đơn trả nhiều lần (trả một phần trước, phần còn lại sau) → trạng thái thanh toán cập nhật đúng theo từng lần.

### Giai đoạn 5 — Financial Reporting & Dashboard
**Mục tiêu:** báo cáo tự suy ra từ dữ liệu đơn hàng — đúng triết lý "Single Source of Truth".

- Công thức Revenue/Expense/Profit (mục 14.2), lọc theo kỳ, cơ sở, loại đơn.
- OtherTransactions (thu/chi ngoài đơn hàng) + TransactionCategories.
- Dashboard: Daily Operations (6 mục), Financial Summary, Inventory Summary (mục 18).

**Nghiệm thu:** đối chiếu tay 1 tháng dữ liệu test (cộng thủ công doanh thu/chi phí từ các đơn bạn tạo ở giai đoạn 2–4) và so với số app hiển thị — phải khớp tuyệt đối, vì đây là mảng dễ sai và khó phát hiện nếu không kiểm tra kỹ.

### Giai đoạn 6 — Audit, Soft Delete, Concurrency
**Mục tiêu:** các yêu cầu "nền" đảm bảo an toàn dữ liệu (mục 16–17 spec), làm sau vì cần đã có đủ luồng nghiệp vụ để audit có gì mà ghi.

- `AuditLogs` cho mọi create/update/delete/restore/status-change trên các entity chính.
- Soft delete nhất quán (ẩn khỏi danh sách, nhưng không mất dữ liệu).
- Optimistic locking (`version`) trên Orders, CameraInstances, FilmBatches — xử lý va chạm khi 2 người sửa cùng lúc.

**Nghiệm thu:** mở đơn hàng ở 2 tab, sửa cùng lúc → tab thứ 2 lưu phải báo lỗi "dữ liệu đã bị người khác sửa" thay vì âm thầm ghi đè.

### Giai đoạn 7 — Data Migration & Backup
**Mục tiêu:** đưa dữ liệu Excel hiện tại vào hệ thống, và đảm bảo hệ thống mới không mất dữ liệu.

- Script `import-excel.ts`: khách hàng, máy, lô phim, đơn đang mở — chạy thử trên Neon branch riêng trước (mục 3.4).
- GitHub Actions backup hàng ngày (mục 3.3).
- Thử restore từ 1 bản backup vào một database tạm, xác nhận dữ liệu nguyên vẹn.

**Nghiệm thu:** bạn tự đối chiếu vài dòng dữ liệu Excel với dữ liệu đã import trong app.

### Giai đoạn 8 — UAT toàn diện & Go-live
**Mục tiêu:** vận hành song song (app + Excel) một thời gian ngắn trước khi ngưng hẳn Excel.

- Chạy toàn bộ 3 luồng nghiệp vụ thật (không phải dữ liệu test) trong khoảng 1–2 tuần, song song với Excel.
- Đối chiếu số liệu cuối mỗi ngày.
- Chỉ ngưng Excel khi bạn đã tự tin về độ chính xác của báo cáo tài chính và tồn kho.

**Nghiệm thu:** không còn chênh lệch giữa Excel và ABMS trong ít nhất 3 ngày liên tiếp.

---

## 3. Hướng dẫn tích hợp dịch vụ ngoài

### 3.1 Neon (PostgreSQL)

1. Tạo tài khoản tại neon.tech, tạo **1 project** (ví dụ đặt tên `abms`).
2. Neon tự tạo sẵn 1 database và 1 branch `main`. Vào **Connection Details**, chọn:
   - **Pooled connection** (qua PgBouncer, cổng có `-pooler` trong hostname) → dùng cho `DATABASE_URL` của app lúc chạy (runtime).
   - **Direct connection** (không qua pooler) → dùng cho `DIRECT_URL`, cần cho Prisma Migrate (migration không chạy tốt qua pooler).
3. Trong `schema.prisma`, cấu hình:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // pooled — dùng lúc chạy app
     directUrl = env("DIRECT_URL")     // direct — dùng lúc migrate
   }
   ```
4. Bật extension `btree_gist` (cần cho exclusion constraint): Neon cho phép chạy `CREATE EXTENSION` trực tiếp qua SQL editor trên dashboard hoặc qua `psql`/migration — không cần quyền superuser đặc biệt.
5. **Neon branching (rất hữu ích cho vai trò "thử nghiệm" của bạn):** tạo thêm 1 branch riêng (ví dụ `staging`) từ `main` để thử nghiệm tính năng mới hoặc chạy `import-excel.ts` mà không sợ ảnh hưởng dữ liệu thật. Mỗi branch có connection string riêng.
6. Theo dõi mục **Usage** trên dashboard để tránh vượt 100 giờ compute/tháng của gói free — với dưới 5 người dùng nội bộ, mức này thường thoải mái.

### 3.2 GitHub + Hosting (Netlify/Cloudflare)

1. Đẩy code lên GitHub repo riêng (private, vì đây là dữ liệu kinh doanh nội bộ).
2. Trên Netlify hoặc Cloudflare Pages: **Import project từ GitHub**, chọn repo, framework tự nhận diện là Next.js.
3. Khai báo biến môi trường trên dashboard hosting (không commit vào git):
   - `DATABASE_URL`, `DIRECT_URL` (từ Neon)
   - `SESSION_SECRET` (chuỗi ngẫu nhiên dài, dùng để ký cookie phiên đăng nhập)
   - `NODE_ENV=production`
4. Mỗi lần push lên nhánh `main` → tự động build & deploy. Nên bật **preview deployment** cho pull request để bạn xem trước khi merge.
5. Trước khi chọn Netlify, kiểm tra lại điều khoản gói Free hiện hành có cho phép dùng cho mục đích kinh doanh nội bộ hay không (điều khoản có thể thay đổi theo thời gian).

### 3.3 GitHub Actions — Backup tự động

Tạo `.github/workflows/backup.yml`:

```yaml
name: Daily Database Backup

on:
  schedule:
    - cron: "0 19 * * *"   # 19:00 UTC = 02:00 sáng giờ VN
  workflow_dispatch: {}      # cho phép bấm chạy tay khi cần

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Dump database
        run: |
          pg_dump "${{ secrets.DATABASE_DIRECT_URL }}" \
            --no-owner --no-privileges -F c \
            -f abms-backup-$(date +%Y%m%d).dump

      - name: Upload to storage
        run: |
          # Ví dụ đẩy lên Cloudflare R2 bằng rclone, hoặc lên chính GitHub
          # dưới dạng artifact/release. Chọn 1 trong 2 cách bên dưới.
          echo "cấu hình nơi lưu backup ở bước này"
```

Hai lựa chọn nơi lưu (chọn 1):

- **Đơn giản nhất — GitHub Release:** dùng action `softprops/action-gh-release` để đính file `.dump` vào một release hàng ngày của chính repo. Miễn phí, không cần thêm tài khoản, nhưng dữ liệu nằm cùng chỗ với code (rủi ro thấp nhưng không "off-site" hoàn toàn).
- **Tách biệt hơn — Cloudflare R2:** tạo bucket R2 (free tier 10GB), dùng `rclone` hoặc AWS CLI (R2 tương thích S3 API) để upload trong workflow, lưu access key vào GitHub Secrets.

Thiết lập secret: vào **Settings → Secrets and variables → Actions** của repo, thêm `DATABASE_DIRECT_URL` (dùng connection direct, không qua pooler, vì `pg_dump` chạy 1 lần rồi đóng kết nối).

Nên giữ tối thiểu 30 bản backup gần nhất (xoá bản cũ hơn bằng 1 step dọn dẹp trong workflow, hoặc để lifecycle rule của R2 tự làm).

### 3.4 Quy trình thử nghiệm an toàn (dành cho vai trò UAT của bạn)

1. Trước khi thử một luồng nghiệp vụ mới hoặc chạy migration dữ liệu, tạo Neon branch mới từ `main` (mục 3.1.5).
2. Trỏ app ở môi trường local hoặc một preview deployment vào branch đó.
3. Thử nghiệm thoải mái — mọi thay đổi chỉ nằm trên branch, không ảnh hưởng dữ liệu thật.
4. Xoá branch sau khi thử xong (hoặc giữ lại làm "staging" lâu dài nếu muốn).

---

## 4. Việc của bạn ở mỗi giai đoạn

| Vai trò | Việc cụ thể |
|---|---|
| **Kiến trúc** | Đọc lại `schema.prisma`/service layer khi Claude bàn giao mỗi giai đoạn, xác nhận có khớp nghiệp vụ thật không, quyết định các điểm mơ hồ còn lại (ví dụ chính sách hoàn/giữ cọc cụ thể cho từng tình huống) |
| **Thử nghiệm** | Chạy các kịch bản nghiệm thu ở mục 2 sau mỗi giai đoạn, dùng Neon branch riêng (mục 3.4) để không ảnh hưởng dữ liệu thật |
| **Vận hành cuối** | Theo dõi Neon usage, xác nhận backup GitHub Actions chạy thành công hàng ngày (tab Actions trên GitHub), quyết định thời điểm go-live (Giai đoạn 8) |

---

## 5. Ghi chú thực thi

- Thứ tự Giai đoạn 2 (Rental) trước Giai đoạn 3 (Film/Print) là chủ đích: rental phức tạp hơn (double booking, deposit, cross-branch) nên làm trước để phát hiện sớm các lỗ hổng thiết kế còn sót; film/print có thể tái dùng nhiều pattern (FIFO, order lifecycle) đã được kiểm chứng.
- Mỗi giai đoạn nên là 1 nhánh git riêng + 1 pull request, để bạn review từng phần thay vì một khối code khổng lồ cuối cùng.
- Nếu giữa chừng phát hiện một quyết định nghiệp vụ trong spec chưa đúng thực tế, nên dừng lại cập nhật `README.md` (spec) trước, rồi mới sửa `schema.prisma`/code — giữ đúng nguyên tắc "spec là nguồn sự thật" đã thống nhất từ đầu.