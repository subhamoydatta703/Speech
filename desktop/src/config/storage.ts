import { app, safeStorage } from "electron";
import { readFile, writeFile, rename, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Activation } from "../shared/types";

export const dataDirectory = () => app.getPath("userData");
export async function saveActivation(value: Activation) {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("Windows account encryption is unavailable.");
  const path = join(dataDirectory(), "activation.bin");
  await mkdir(dataDirectory(), { recursive: true });
  await writeFile(
    path + ".tmp",
    safeStorage.encryptString(JSON.stringify(value)),
  );
  await rename(path + ".tmp", path);
}
export async function loadActivation(): Promise<Activation | undefined> {
  try {
    const value = JSON.parse(
      safeStorage.decryptString(
        await readFile(join(dataDirectory(), "activation.bin")),
      ),
    );
    if (
      typeof value.user?.id === "string" &&
      typeof value.user?.email === "string" &&
      Number.isFinite(value.activatedAt)
    )
      return value;
  } catch {
    /* New install or local activation cannot be decrypted. Setup will recover. */
  }
}
export async function clearActivation() {
  await unlink(join(dataDirectory(), "activation.bin")).catch(() => {});
}
export async function loadShortcut() {
  try {
    const value = JSON.parse(
      await readFile(join(dataDirectory(), "preferences.json"), "utf8"),
    );
    if (validShortcut(value.shortcut)) return value.shortcut as string;
  } catch {
    /* Use default on first run. */
  }
  return "Control+Shift+Space";
}
export function validShortcut(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(Control|Alt|Shift|Super)(\+(Control|Alt|Shift|Super)){0,2}\+(Space|[A-Z0-9]|F([1-9]|1[0-2]))$/.test(
      value,
    )
  );
}
export async function saveShortcut(shortcut: string) {
  await writeFile(
    join(dataDirectory(), "preferences.json"),
    JSON.stringify({ shortcut }),
  );
}
