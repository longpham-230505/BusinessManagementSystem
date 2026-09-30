import type { Prisma } from "@prisma/client";

/** Prisma client bên trong `prisma.$transaction(async (db) => ...)`. */
export type Db = Prisma.TransactionClient;
