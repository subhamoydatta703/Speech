import { _electron as electron, expect } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const testDirectory = resolve(`.smoke/user-data-${Date.now()}`);
await mkdir(testDirectory, { recursive: true });
const application = await electron.launch({
  args: [resolve(".")],
  env: {
    ...process.env,
    NODE_ENV: "test",
    SPEECH_TEST_USER_DATA: testDirectory,
  },
  timeout: 30000,
});
application
  .process()
  .stderr?.on("data", (value) => process.stderr.write(value));
application
  .process()
  .stdout?.on("data", (value) => process.stdout.write(value));
try {
  const page = await application.firstWindow();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "A little setup. Then speak." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download model", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Test dictation here" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue installation in browser" }),
  ).toBeEnabled();
  expect(
    await application.evaluate(({ globalShortcut }) =>
      globalShortcut.isRegistered("Control+Shift+Space"),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => typeof (window as any).require)).toBe(
    "undefined",
  );
  expect(await page.evaluate(() => typeof (window as any).process)).toBe(
    "undefined",
  );
  await page.screenshot({ path: ".smoke/desktop-setup.png" });
  expect(errors).toEqual([]);
  console.log(
    "Desktop setup, sandboxed preload, activation gate, model gate and global shortcut passed.",
  );
} finally {
  await application.close();
}
