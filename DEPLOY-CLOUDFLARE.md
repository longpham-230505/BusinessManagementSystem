# Deploy lên Cloudflare Workers (database vẫn là Neon, qua Hyperdrive)

Ứng dụng chạy trên Cloudflare Workers nhờ adapter OpenNext (`@opennextjs/cloudflare`).
Database giữ nguyên Neon PostgreSQL; Worker nối tới Neon qua **Hyperdrive** (gom connection ở
gần database). Code dùng `@prisma/adapter-pg` — xem `src/server/db.ts`.

## Cần làm một lần (trên tài khoản Cloudflare của bạn)

1. Đăng nhập: `npx wrangler login`
2. Tạo Hyperdrive (dùng **DIRECT_URL** của Neon, không dùng pooler — Hyperdrive tự gom connection):
   ```
   npx wrangler hyperdrive create abms --connection-string="<DIRECT_URL>"
   ```
   Chép `id` in ra vào `wrangler.jsonc` (thay `REPLACE_WITH_HYPERDRIVE_ID`).
3. Đặt secret ký session (dùng cùng giá trị với `.env` nếu muốn giữ phiên đăng nhập hiện tại):
   ```
   npx wrangler secret put SESSION_SECRET
   ```
4. Tạo Neon project cùng khu vực gần người dùng (vd. Singapore `ap-southeast-1`); `placement.mode =
   "smart"` trong `wrangler.jsonc` sẽ đặt Worker gần database.

## Chạy thử và deploy thủ công

| Lệnh | Việc làm |
|---|---|
| `npm run preview:cf` | Build Worker và chạy local bằng `workerd` (cần biến `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` = chuỗi Neon) |
| `npm run deploy:cf` | Build rồi deploy lên Cloudflare |

Windows: OpenNext cảnh báo chưa hỗ trợ chính thức nhưng build/preview đã chạy được; nếu gặp lỗi lạ hãy dùng WSL hoặc CI.

## Tự động deploy khi push vào `main`

**Cách 1 — Cloudflare Workers Builds (dễ nhất):** Workers & Pages → Create → Import a repository →
chọn repo này.
- Production branch: `main`
- Build command: `npm ci && npm run build:cf`
- Deploy command: `npx wrangler deploy` (hoặc `npx opennextjs-cloudflare deploy` — cả hai đều chạy được; lệnh thứ hai cần `localConnectionString` giả trong `wrangler.jsonc`, đã có sẵn)
- Non-production branch deploy command: `npx wrangler versions upload` (cần khối `previews` trong `wrangler.jsonc`, đã có sẵn; secret `SESSION_SECRET` của preview đặt riêng trong dashboard)
- Biến build: không cần `DATABASE_URL` (build không đọc database).

**Cách 2 — GitHub Actions:** secrets `CLOUDFLARE_API_TOKEN` (quyền Workers edit) và
`CLOUDFLARE_ACCOUNT_ID`, rồi chạy `npm ci && npm run deploy:cf` trên nhánh `main`.

> `npm` mới có thể bỏ qua script cài đặt của `prisma`, vì vậy `build:cf` luôn chạy `prisma generate` trước.

## Migration database

`prisma migrate deploy` KHÔNG chạy trong Worker. Chạy riêng (từ máy bạn hoặc một bước CI có kiểm soát)
với `DIRECT_URL` của Neon, **trước** khi deploy phiên bản code cần schema mới.

## Giới hạn cần biết

- Kích thước Worker hiện ~1.9 MiB nén (giới hạn Free 3 MiB, Paid 10 MiB).
- CPU mỗi request: `bcryptjs` (cost 10 trong lúc đăng nhập) tốn nhiều CPU; gói Free chỉ cho rất ít CPU
  mỗi request nên đăng nhập có thể bị cắt. Nếu gặp lỗi 1102 khi đăng nhập hãy dùng gói Workers Paid,
  hoặc chuyển băm mật khẩu sang WebCrypto PBKDF2 (phải đặt lại mật khẩu 2 tài khoản).
- Biến môi trường `DATABASE_URL`/`DIRECT_URL` chỉ dùng ở máy local và khi migrate; trên Worker dùng binding `HYPERDRIVE`.
