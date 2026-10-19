import { describe, expect, test } from 'bun:test';
import { createHuggingFaceProvider } from '../src/services/transcription.service';
import { testConfig, wav } from './helpers';

describe('Hugging Face adapter with mocked HTTP transport', () => {
  test('sends binary audio using server token and normalizes the response', async () => {
    let calls = 0;
    const transport = (async (url: string | URL | Request, init?: RequestInit) => {
      calls++;
      expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${testConfig.HF_TOKEN}`);
      expect(init?.signal).toBeDefined();
      if (String(url).includes('/api/models/'))
        return Response.json({
          inferenceProviderMapping: {
            'hf-inference': {
              providerId: testConfig.HF_MODEL,
              status: 'live',
              task: 'automatic-speech-recognition',
            },
          },
        });
      expect(String(url)).toContain('router.huggingface.co/hf-inference/models/');
      return Response.json({ text: '  Hello\n world.  ' });
    }) as typeof fetch;
    const provider = createHuggingFaceProvider(testConfig, transport);
    expect(await provider.transcribe(wav(), new AbortController().signal)).toBe('Hello world.');
    expect(calls).toBe(2);
  });
  test('does not retry provider failures or expose upstream error details', async () => {
    let calls = 0;
    const transport = (async () => {
      calls++;
      return Response.json({ error: 'private upstream details' }, { status: 503 });
    }) as unknown as typeof fetch;
    const provider = createHuggingFaceProvider(testConfig, transport);
    await expect(provider.transcribe(wav(), new AbortController().signal)).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    expect(calls).toBe(1);
  });
  test.each([{ text: '' }, { text: 123 }, { text: 'x'.repeat(13000) }])(
    'handles invalid or empty output',
    async (response) => {
      const transport = (async () => Response.json(response)) as unknown as typeof fetch;
      const provider = createHuggingFaceProvider(testConfig, transport);
      await expect(provider.transcribe(wav(), new AbortController().signal)).rejects.toBeInstanceOf(
        Error,
      );
    },
  );
  test('caps provider response size', async () => {
    const transport = (async () => new Response('x'.repeat(300000))) as unknown as typeof fetch;
    await expect(
      createHuggingFaceProvider(testConfig, transport).transcribe(
        wav(),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
  test('aborts stalled inference at its deadline', async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const transport = (async (_url: unknown, init?: RequestInit) => {
      receivedSignal = init?.signal;
      return new Promise<Response>((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
      );
    }) as typeof fetch;
    const provider = createHuggingFaceProvider(
      { ...testConfig, PROVIDER_TIMEOUT_MS: 25 },
      transport,
    );
    await expect(provider.transcribe(wav(), new AbortController().signal)).rejects.toMatchObject({
      code: 'PROVIDER_TIMEOUT',
    });
    expect(receivedSignal?.aborted).toBe(true);
  });
});
