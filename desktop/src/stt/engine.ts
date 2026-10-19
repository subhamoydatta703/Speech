import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { encodeWav } from "../audio/pcm";

const prefix = "speech-dictation-";
export async function cleanStaleAudio() {
  const root = resolve(tmpdir());
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith(prefix)) {
      const path = resolve(root, entry.name);
      if (path.startsWith(root + "\\"))
        await rm(path, { recursive: true, force: true });
    }
  }
}
export async function transcribe(
  engine: string,
  model: string,
  samples: Float32Array,
  rate: number,
  signal: AbortSignal,
) {
  const audio = encodeWav(samples, rate);
  const directory = await mkdtemp(join(tmpdir(), prefix));
  const input = join(directory, "audio.wav"),
    output = join(directory, "result");
  try {
    await writeFile(input, audio);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        engine,
        [
          "-m",
          model,
          "-f",
          input,
          "-l",
          "auto",
          "-otxt",
          "-of",
          output,
          "-nt",
          "-np",
        ],
        { windowsHide: true, stdio: "ignore", signal },
      );
      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new Error("Transcription took too long. Try a shorter recording."),
        );
      }, 180000);
      child.once("error", () => {
        clearTimeout(timeout);
        reject(
          new Error(
            signal.aborted
              ? "Transcription cancelled."
              : "The speech engine could not start. Repair the installation.",
          ),
        );
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        code === 0
          ? resolve()
          : reject(
              new Error(
                signal.aborted
                  ? "Transcription cancelled."
                  : "The speech engine failed. Check your model and try again.",
              ),
            );
      });
    });
    signal.throwIfAborted();
    return (await readFile(output + ".txt", "utf8"))
      .trim()
      .replace(/\s+/g, " ");
  } finally {
    audio.fill(0);
    samples.fill(0);
    // Only this function's unique temporary subdirectory is removed.
    if (!resolve(directory).startsWith(resolve(tmpdir(), prefix)))
      throw new Error("Invalid temporary cleanup path");
    await rm(directory, { recursive: true, force: true });
  }
}
