import { readConfig } from './config/env';
import { createUserRepository } from './config/db';
import { createHuggingFaceProvider } from './services/transcription.service';
import { buildApp } from './app';

async function main() {
  const config = readConfig();
  const users = createUserRepository(config.DATABASE_URL);
  const app = await buildApp(config, {
    users,
    provider: createHuggingFaceProvider(config),
    logger: true,
  });
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    try {
      await app.close();
    } finally {
      clearTimeout(deadline);
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch {
    await app.close();
    throw new Error('Startup failed');
  }
}

main().catch(() => {
  // Configuration errors can contain credentials. Never dump environment or exception objects.
  console.error(
    'Backend could not start. Check environment configuration, dependencies, and port availability.',
  );
  process.exitCode = 1;
});
