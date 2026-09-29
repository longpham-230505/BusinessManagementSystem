/**
 * Tạo tài khoản nội bộ. Hệ thống chỉ có 2 tài khoản, tạo thủ công bằng
 * script này (không có UI đăng ký — đúng spec mục 5).
 *
 * Dùng:
 *   npm run create-user -- "you@business-a.vn" "mật khẩu mạnh" "Tên hiển thị"
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/db";

async function main() {
  const [email, password, displayName] = process.argv.slice(2);

  if (!email || !password || !displayName) {
    console.error(
      'Cách dùng: npm run create-user -- "email" "mật khẩu" "Tên hiển thị"'
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, displayName, isActive: true },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      isActive: true,
    },
  });

  console.log(`Đã tạo/cập nhật tài khoản: ${user.email} (${user.displayName})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
