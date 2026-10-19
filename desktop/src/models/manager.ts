import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, open, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { MODEL } from "./manifest";

export function modelPath(directory: string) {
  return join(directory, "models", MODEL.filename);
}
export async function verifyModel(path: string): Promise<boolean> {
  try {
    if ((await stat(path)).size !== MODEL.size) return false;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex") === MODEL.sha256;
  } catch {
    return false;
  }
}
export async function downloadModel(
  directory: string,
  signal: AbortSignal,
  progress: (percentage: number) => void,
) {
  const path = modelPath(directory),
    partial = path + ".partial";
  await mkdir(join(directory, "models"), { recursive: true });
  const file = await open(partial, "w");
  let length = 0;
  const hash = createHash("sha256");
  try {
    const response = await fetch(MODEL.url, { signal });
    if (!response.ok || !response.body)
      throw new Error(
        "Model download could not start. Check your internet connection.",
      );
    for await (const chunk of response.body) {
      signal.throwIfAborted();
      length += chunk.length;
      if (length > MODEL.size)
        throw new Error("Unexpected model download size.");
      hash.update(chunk);
      await file.writeFile(chunk);
      progress(Math.floor((length / MODEL.size) * 100));
    }
    if (length !== MODEL.size || hash.digest("hex") !== MODEL.sha256)
      throw new Error("Model verification failed. Please download it again.");
    await file.close();
    signal.throwIfAborted();
    await rename(partial, path);
  } catch (error) {
    await file.close().catch(() => {});
    await unlink(partial).catch(() => {});
    throw error;
  }
}
