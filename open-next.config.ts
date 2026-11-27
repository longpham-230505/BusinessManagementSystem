import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Toàn bộ trang đều động (đọc database, cần đăng nhập) nên không cấu hình cache/ISR.
export default defineCloudflareConfig();
