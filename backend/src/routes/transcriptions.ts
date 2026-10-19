import type { FastifyInstance } from 'fastify';
import type { TranscriptionResult } from '@speech/contracts';
import type { RouteContext } from '../lib/route-context';
import { readAudioUpload } from '../lib/audio-upload';
import { validateWav } from '../lib/audio';
import { abortError, untilAborted } from '../lib/errors';

export async function registerTranscriptionRoutes(app: FastifyInstance, context: RouteContext) {
  const { config, provider, beginRequest, requireUser, getRequestSignal } = context;

  app.post(
    '/v1/transcriptions',
    {
      bodyLimit: config.MAX_UPLOAD_BYTES + 16384,
      onRequest: [beginRequest, requireUser],
    },
    async (request): Promise<TranscriptionResult> => {
      const signal = getRequestSignal(request);
      let originalAudio: Buffer | undefined;
      let normalizedAudio: Buffer | undefined;

      try {
        const upload = await readAudioUpload(request, signal);
        originalAudio = upload.audio;

        const validated = validateWav(originalAudio, config.MAX_AUDIO_SECONDS);
        normalizedAudio = validated.wav;

        const startedAt = performance.now();
        const text = await untilAborted(provider.transcribe(normalizedAudio, signal), signal);
        if (signal.aborted) throw abortError(signal);

        return {
          requestId: request.id,
          ...upload.metadata,
          text,
          model: provider.model,
          audioDurationMs: validated.durationMs,
          processingDurationMs: Math.round(performance.now() - startedAt),
        };
      } finally {
        originalAudio?.fill(0);
        normalizedAudio?.fill(0);
        // Runtime/SDK copies are garbage-collected. No file or database receives this audio.
      }
    },
  );
}
