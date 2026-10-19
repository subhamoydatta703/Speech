import { prisma } from './config/db';
import { buildApp } from './app';

async function main() {
  const config = {
    HOST: process.env.HOST ?? '0.0.0.0',
    PORT: Number(process.env.PORT ?? 4000),
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ?? '',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? '',
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    MAX_CONCURRENT_REQUESTS: Number(process.env.MAX_CONCURRENT_REQUESTS ?? 4),
    REQUESTS_PER_MINUTE: Number(process.env.REQUESTS_PER_MINUTE ?? 60),
    REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS ?? 10000),
    WINDOWS_INSTALLER_PATH: process.env.WINDOWS_INSTALLER_PATH || undefined,
  };
  if (!config.CLERK_PUBLISHABLE_KEY || !config.CLERK_SECRET_KEY) {
    throw new Error('Clerk publishable and secret keys are required');
  }
  for (const value of [
    config.PORT,
    config.MAX_CONCURRENT_REQUESTS,
    config.REQUESTS_PER_MINUTE,
    config.REQUEST_TIMEOUT_MS,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid server setting');
  }
  const app = buildApp(config);
  const server = app.listen(config.PORT, config.HOST);
  server.requestTimeout = config.REQUEST_TIMEOUT_MS;
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    app.emit('shutdown');
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.$disconnect();
    } finally {
      clearTimeout(deadline);
    }
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
}

main().catch(async (error) => {
  console.error(
    'Backend could not start. Check environment configuration, dependencies, and port availability.',
  );
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
