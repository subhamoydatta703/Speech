import { InferenceClient } from '@huggingface/inference';
import type { Config } from '../config/env';
import { ApiError, abortError, untilAborted } from '../lib/errors';

export interface SttProvider {
  readonly model: string;
  transcribe(wav: Buffer, signal: AbortSignal): Promise<string>;
}

/** Limit upstream response sizes as well as incoming uploads. Never log SDK errors. */
export function boundedFetch(transport: typeof fetch = fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await transport(input, { ...init, redirect: 'error' });
    const maxBytes = 256 * 1024;
    const declared = Number(response.headers.get('content-length'));
    if (declared > maxBytes) {
      await response.body?.cancel();
      throw new Error('Provider response too large');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty provider response');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new Error('Provider response too large');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return new Response(Buffer.concat(chunks), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }) as typeof fetch;
}

export function createHuggingFaceProvider(
  config: Config,
  transport: typeof fetch = fetch,
): SttProvider {
  const client = new InferenceClient(config.HF_TOKEN);
  const request = boundedFetch(transport);
  return {
    model: config.HF_MODEL,
    async transcribe(wav, parentSignal) {
      const controller = new AbortController();
      const onCancel = () => controller.abort(abortError(parentSignal));
      parentSignal.addEventListener('abort', onCancel, { once: true });
      if (parentSignal.aborted) onCancel();
      const timeout = setTimeout(
        () =>
          controller.abort(
            new ApiError(
              504,
              'PROVIDER_TIMEOUT',
              'Transcription took too long. Please retry.',
              true,
            ),
          ),
        config.PROVIDER_TIMEOUT_MS,
      );
      try {
        controller.signal.throwIfAborted();
        // The SDK's model-discovery request does not inherit options.signal itself.
        const scopedFetch = ((input: RequestInfo | URL, init?: RequestInit) =>
          request(input, { ...init, signal: controller.signal })) as typeof fetch;
        const result = await untilAborted(
          client.automaticSpeechRecognition(
            {
              model: config.HF_MODEL,
              provider: 'hf-inference',
              data: new Blob([new Uint8Array(wav)], { type: 'audio/wav' }),
            },
            { signal: controller.signal, retry_on_error: false, fetch: scopedFetch },
          ),
          controller.signal,
        );
        if (typeof result.text !== 'string' || result.text.length > 12000)
          throw new Error('Invalid result');
        const text = result.text.replace(/\s+/gu, ' ').trim();
        if (!text) throw new ApiError(422, 'NO_SPEECH', 'No speech was recognized.');
        return text;
      } catch (error) {
        if (controller.signal.aborted) throw abortError(controller.signal);
        if (error instanceof ApiError) throw error;
        // SDK errors may contain request headers, provider credentials and response text.
        throw new ApiError(
          503,
          'PROVIDER_UNAVAILABLE',
          'Speech recognition is temporarily unavailable.',
          true,
        );
      } finally {
        clearTimeout(timeout);
        parentSignal.removeEventListener('abort', onCancel);
      }
    },
  };
}
