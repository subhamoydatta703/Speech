export const MAX_SECONDS = 60;

/** Average source samples into 16 kHz mono, then write a standard PCM16 WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < 16000 ||
    sampleRate > 192000 ||
    samples.length > sampleRate * MAX_SECONDS ||
    samples.length < sampleRate / 4
  )
    throw new Error("Record between 0.25 and 60 seconds of audio.");
  let energy = 0;
  for (const value of samples) {
    if (!Number.isFinite(value)) throw new Error("Invalid microphone audio.");
    energy += value * value;
  }
  if (Math.sqrt(energy / samples.length) < 0.003)
    throw new Error(
      "No clear audio detected. Move closer to your microphone and try again.",
    );
  const ratio = sampleRate / 16000;
  const count = Math.floor(samples.length / ratio);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + count * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * ratio),
      end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let value = 0;
    for (let j = start; j < end; j++) value += samples[j];
    value = Math.max(-1, Math.min(1, value / (end - start)));
    wav.writeInt16LE(
      Math.round(value * (value < 0 ? 32768 : 32767)),
      44 + i * 2,
    );
  }
  return wav;
}
