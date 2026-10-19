import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "product-review.spec.ts",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium" },
  webServer: {
    command: "bun run start --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" },
    timeout: 120000,
  },
});
