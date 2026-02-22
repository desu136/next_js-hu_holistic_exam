import { PrismaClient } from "@prisma/client";

declare global {
  interface Global {
    prisma?: PrismaClient;
  }
}

const globalForPrisma = globalThis as unknown as Global;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
