import { defineConfig } from 'prisma/config';

// Bun loads backend/.env. Generation works without a database connection.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
