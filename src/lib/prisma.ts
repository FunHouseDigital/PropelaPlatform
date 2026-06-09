import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient | undefined;

try {
  prismaClient = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
  }
} catch {
  // PrismaClient not generated yet - this is expected in development
  // when prisma generate has not been run
  prismaClient = undefined;
}

export const prisma = prismaClient;
