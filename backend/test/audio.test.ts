import { describe, expect, test } from 'bun:test';
import { validateWav } from '../src/lib/audio';
import { wav } from './helpers';

describe('bounded WAV validation', () => {
  test('computes duration from samples and canonicalizes valid PCM', () => {
    const input = wav(1);
    const result = validateWav(input, 60);
    expect(result.durationMs).toBe(1000);
    expect(result.wav.equals(input)).toBe(true);
  });
  test('removes metadata before sending audio upstream', () => {
    const input = wav();
    const metadata = Buffer.from('LIST\x04\x00\x00\x00NAME');
    const tagged = Buffer.concat([input, metadata]);
    tagged.writeUInt32LE(tagged.length - 8, 4);
    expect(validateWav(tagged, 60).wav.equals(input)).toBe(true);
  });
  test.each([Buffer.alloc(0), Buffer.from('not audio'), wav().subarray(0, 40)])(
    'rejects truncated/non-WAV data',
    (input) => {
      expect(() => validateWav(input, 60)).toThrow();
    },
  );
  test.each([
    [20, 3],
    [22, 2],
    [24, 48000],
    [28, 1],
    [32, 4],
    [34, 8],
  ])('rejects incompatible format offset %i', (offset, value) => {
    const input = wav();
    input.writeUInt16LE(value!, offset!);
    expect(() => validateWav(input, 60)).toThrow();
  });
  test('rejects silence, tiny audio and oversized duration', () => {
    expect(() => validateWav(wav(1, 0), 60)).toThrow('silent');
    expect(() => validateWav(wav(0.01), 60)).toThrow();
    expect(() => validateWav(wav(2), 1)).toThrow('at most 1');
  });
  test('rejects overflowing chunk sizes and duplicate PCM data chunks', () => {
    const invalid = wav();
    invalid.writeUInt32LE(0xffffffff, 40);
    expect(() => validateWav(invalid, 60)).toThrow();
    const original = wav();
    const duplicate = Buffer.concat([original, original.subarray(36)]);
    duplicate.writeUInt32LE(duplicate.length - 8, 4);
    expect(() => validateWav(duplicate, 60)).toThrow();
  });
});
