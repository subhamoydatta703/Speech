import { createHash } from "node:crypto";
import {
  mkdir,
  writeFile,
  readFile,
  readdir,
  copyFile,
  rm,
  unlink,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { ENGINE, WINDOWS_RUNTIME } from "../src/models/manifest";

const directory = resolve("resources/engine");
await mkdir(directory, { recursive: true });
const archive = resolve("resources/whisper-engine.zip");
const unpacked = resolve("resources/engine-unpacked");
let bytes: Buffer;
try {
  bytes = await readFile(archive);
} catch {
  const response = await fetch(ENGINE.url, {
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw new Error(`Engine download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (createHash("sha256").update(bytes).digest("hex") !== ENGINE.sha256)
  throw new Error("Engine archive checksum mismatch");
await writeFile(archive, bytes);
const expanded = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Expand-Archive -LiteralPath $env:SPEECH_ENGINE_ZIP -DestinationPath $env:SPEECH_ENGINE_DEST -Force",
  ],
  {
    windowsHide: true,
    env: {
      ...process.env,
      SPEECH_ENGINE_ZIP: archive,
      SPEECH_ENGINE_DEST: unpacked,
    },
    encoding: "utf8",
  },
);
if (expanded.status !== 0)
  throw new Error("Could not extract the verified engine archive");
async function copyBinaries(folder: string) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) await copyBinaries(path);
    else if (
      [
        "whisper-cli.exe",
        "whisper.dll",
        "ggml.dll",
        "ggml-base.dll",
        "ggml-cpu.dll",
      ].includes(item.name) ||
      /license/i.test(item.name)
    )
      await copyFile(path, join(directory, item.name));
  }
}
await copyBinaries(unpacked);
await readFile(join(directory, "whisper-cli.exe"));
for (const name of await readdir(directory)) {
  if (
    /\.(exe|dll)$/i.test(name) &&
    ![
      "whisper-cli.exe",
      "whisper.dll",
      "ggml.dll",
      "ggml-base.dll",
      "ggml-cpu.dll",
    ].includes(name)
  )
    await unlink(join(directory, name));
}
const license = await fetch(
  "https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.8.4/LICENSE",
);
if (!license.ok) throw new Error("Could not fetch the engine license");
await writeFile(
  join(directory, "LICENSE.whisper.cpp.txt"),
  await license.text(),
);
const runtimePath = resolve("resources/windows/vc_redist.x64.exe");
let runtime: Buffer;
try {
  runtime = await readFile(runtimePath);
} catch {
  const response = await fetch(WINDOWS_RUNTIME.url, {
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw new Error("Could not download the Microsoft runtime installer");
  runtime = Buffer.from(await response.arrayBuffer());
}
if (
  createHash("sha256").update(runtime).digest("hex") !== WINDOWS_RUNTIME.sha256
)
  throw new Error("Microsoft runtime checksum mismatch");
await writeFile(runtimePath, runtime);
// Targets are fixed, resolved workspace subdirectories created by this script.
if (!unpacked.startsWith(resolve("resources") + "\\"))
  throw new Error("Invalid extraction cleanup path");
await rm(unpacked, { recursive: true, force: true });
console.log(
  `Prepared verified whisper.cpp ${ENGINE.version} Windows x64 engine`,
);
