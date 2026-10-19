import { ApiError } from './errors';

export const AUDIO_FORMAT = {
  container: 'wav',
  encoding: 'pcm_s16le',
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
} as const;

export function validateWav(
  input: Buffer,
  maxSeconds: number,
): { wav: Buffer; durationMs: number } {
  const invalid = () =>
    new ApiError(
      400,
      'INVALID_AUDIO',
      'Send a complete PCM WAV file: 16 kHz, mono, 16-bit, between 0.1 and 60 seconds.',
    );
  if (
    input.length < 44 ||
    input.toString('ascii', 0, 4) !== 'RIFF' ||
    input.toString('ascii', 8, 12) !== 'WAVE' ||
    input.readUInt32LE(4) + 8 !== input.length
  )
    throw invalid();
  let pcm: Buffer | undefined;
  let formatSeen = false;
  let position = 12;
  while (position < input.length) {
    if (position + 8 > input.length) throw invalid();
    const name = input.toString('ascii', position, position + 4);
    const length = input.readUInt32LE(position + 4);
    const start = position + 8;
    const end = start + length;
    if (end > input.length) throw invalid();
    if (name === 'fmt ') {
      if (
        formatSeen ||
        length !== 16 ||
        input.readUInt16LE(start) !== 1 ||
        input.readUInt16LE(start + 2) !== 1 ||
        input.readUInt32LE(start + 4) !== 16000 ||
        input.readUInt32LE(start + 8) !== 32000 ||
        input.readUInt16LE(start + 12) !== 2 ||
        input.readUInt16LE(start + 14) !== 16
      )
        throw invalid();
      formatSeen = true;
    } else if (name === 'data') {
      if (pcm || !formatSeen || length % 2 !== 0) throw invalid();
      pcm = input.subarray(start, end);
    }
    position = end + (length % 2);
    if (position > input.length) throw invalid();
  }
  if (!formatSeen || !pcm || pcm.length < 3200) throw invalid();
  const durationMs = pcm.length / 32;
  if (durationMs > maxSeconds * 1000) {
    throw new ApiError(413, 'AUDIO_TOO_LARGE', `Audio must be at most ${maxSeconds} seconds.`);
  }
  let energy = 0;
  for (let i = 0; i < pcm.length; i += 2) energy += (pcm.readInt16LE(i) / 32768) ** 2;
  if (Math.sqrt(energy / (pcm.length / 2)) < 0.0001) {
    throw new ApiError(422, 'NO_SPEECH', 'The recording is silent or too quiet.');
  }
  // Canonicalize: only PCM samples go upstream, not arbitrary WAV metadata chunks.
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return { wav, durationMs };
}
