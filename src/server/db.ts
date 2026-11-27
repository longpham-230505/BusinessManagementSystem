import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma client dùng chung toàn app (`import { prisma } from "@/server/db"`).
 *
 * - Trên Cloudflare Workers: kết nối qua Hyperdrive (binding `HYPERDRIVE`). Workers không cho
 *   dùng lại đối tượng I/O giữa các request, nên mỗi request có một client riêng (WeakMap theo
 *   `ctx` của request) — Hyperdrive lo việc gom connection phía database.
 * - Chạy bằng Node (dev, build, `scripts/*`): một client dùng chung, kết nối thẳng bằng
 *   `DATABASE_URL` (pooled connection của Neon).
 *
 * Mã nghiệp vụ không cần biết môi trường nào: `prisma` là proxy trỏ tới client phù hợp.
 */

const LOG_LEVELS: ("warn" | "error")[] =
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

/** Cloudflare giới hạn 6 kết nối đồng thời cho mỗi request. */
const WORKER_POOL_MAX = 5;

function createClient(connectionString: string, poolMax?: number): PrismaClient {
  const adapter = new PrismaPg({ connectionString, ...(poolMax ? { max: poolMax } : {}) });
  return new PrismaClient({ adapter, log: LOG_LEVELS });
}

/** Binding Hyperdrive của request hiện tại; `undefined` khi không chạy trên Workers. */
function getWorkerBinding(): { ctx: object; connectionString: string } | undefined {
  try {
    const { env, ctx } = getCloudflareContext();
    return env.HYPERDRIVE
      ? { ctx, connectionString: env.HYPERDRIVE.connectionString }
      : undefined;
  } catch {
    return undefined; // ngoài Workers (hoặc ngoài một request) thì không có context
  }
}

const clientsByRequest = new WeakMap<object, PrismaClient>();

// Tránh tạo nhiều PrismaClient khi Next.js hot-reload lúc dev.
// Xem: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  const worker = getWorkerBinding();
  if (worker) {
    let client = clientsByRequest.get(worker.ctx);
    if (!client) {
      client = createClient(worker.connectionString, WORKER_POOL_MAX);
      clientsByRequest.set(worker.ctx, client);
    }
    return client;
  }

  if (!globalForPrisma.prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL chưa được cấu hình (xem .env.example)");
    globalForPrisma.prisma = createClient(url);
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
