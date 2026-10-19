import { expect, test } from "bun:test";
import { encodeWav } from "../src/audio/pcm";

test("resamples 48 kHz mono audio into a valid 16 kHz PCM16 WAV", () => {
  const audio = Float32Array.from(
    { length: 48000 },
    (_, index) => Math.sin(index / 30) * 0.4,
  );
  const wav = encodeWav(audio, 48000);
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.readUInt32LE(24)).toBe(16000);
  expect(wav.readUInt16LE(22)).toBe(1);
  expect(wav.readUInt32LE(40)).toBe(32000);
  expect(wav.length).toBe(32044);
});
test("rejects silence, nonfinite audio, invalid rates and excessive duration", () => {
  expect(() => encodeWav(new Float32Array(16000), 16000)).toThrow(
    "No clear audio",
  );
  const invalid = new Float32Array(16000).fill(0.2);
  invalid[10] = NaN;
  expect(() => encodeWav(invalid, 16000)).toThrow("Invalid microphone");
  expect(() => encodeWav(new Float32Array(16000), 8000)).toThrow();
  expect(() => encodeWav(new Float32Array(16000 * 61), 16000)).toThrow();
});
test("clamps overdriven input to PCM16 bounds", () => {
  const audio = new Float32Array(16000).fill(2);
  audio[0] = -2;
  const wav = encodeWav(audio, 16000);
  expect(wav.readInt16LE(44)).toBe(-32768);
  expect(wav.readInt16LE(46)).toBe(32767);
});
