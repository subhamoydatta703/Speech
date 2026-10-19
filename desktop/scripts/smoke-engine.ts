import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { downloadModel, modelPath, verifyModel } from "../src/models/manager";
import { transcribe } from "../src/stt/engine";

const directory = resolve(".smoke");
await mkdir(directory, { recursive: true });
if (!(await verifyModel(modelPath(directory)))) {
  let last = -1;
  await downloadModel(directory, new AbortController().signal, (percentage) => {
    if (Math.floor(percentage / 10) !== last) {
      last = Math.floor(percentage / 10);
      console.log(`Test model: ${percentage}%`);
    }
  });
}
const response = await fetch(
  "https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.8.4/samples/jfk.wav",
);
if (!response.ok) throw new Error("Could not download upstream test speech");
const wav = Buffer.from(await response.arrayBuffer());
await writeFile(resolve(directory, "jfk.wav"), wav);
// Parse RIFF chunks instead of assuming every WAV has a 44-byte header.
let offset = 12,
  samples: Float32Array | undefined,
  rate = 0;
while (offset + 8 <= wav.length) {
  const kind = wav.toString("ascii", offset, offset + 4),
    size = wav.readUInt32LE(offset + 4),
    start = offset + 8;
  if (kind === "fmt ") {
    if (
      wav.readUInt16LE(start) !== 1 ||
      wav.readUInt16LE(start + 2) !== 1 ||
      wav.readUInt16LE(start + 14) !== 16
    )
      throw new Error("Unsupported upstream sample format");
    rate = wav.readUInt32LE(start + 4);
  }
  if (kind === "data")
    samples = Float32Array.from(
      { length: size / 2 },
      (_, index) => wav.readInt16LE(start + index * 2) / 32768,
    );
  offset = start + size + (size % 2);
}
if (!samples || !rate) throw new Error("Test audio missing PCM data");
const start = Date.now();
const text = await transcribe(
  resolve("resources/engine/whisper-cli.exe"),
  modelPath(directory),
  samples,
  rate,
  new AbortController().signal,
);
if (!/ask not/i.test(text) || !/country/i.test(text))
  throw new Error(
    "Local engine did not recognize the expected upstream test sentence",
  );
await writeFile(
  resolve(directory, "engine-result.json"),
  JSON.stringify(
    {
      engine: "whisper.cpp v1.8.4",
      model: "Whisper Base",
      milliseconds: Date.now() - start,
      test: "upstream public JFK sample",
      recognizedExpectedSentence: true,
    },
    null,
    2,
  ),
);
console.log(
  "Local inference passed on upstream JFK audio. No cloud transcription used.",
);
