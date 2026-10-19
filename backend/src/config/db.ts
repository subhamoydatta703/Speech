import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { UserRepository } from '../services/user.service';

export function createUserRepository(connectionString: string): UserRepository {
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
    query_timeout: 7000,
  });
  const prisma = new PrismaClient({ adapter, log: [] });
  const select = { id: true, email: true } as const;
  return {
    find: (id) => prisma.user.findUnique({ where: { id }, select }),
    upsert: (user) =>
      prisma.user.upsert({
        where: { id: user.id },
        create: user,
        update: { email: user.email },
        select,
      }),
    ready: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    close: () => prisma.$disconnect(),
  };
}
