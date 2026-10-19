import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testMatch: 'product-review.spec.ts',
  testIgnore: [],
  webServer: {
    ...config.webServer,
    command: 'bun run start --port 3100',
    url: 'http://127.0.0.1:3100',
    env: { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '', CLERK_SECRET_KEY: '' },
  },
});
