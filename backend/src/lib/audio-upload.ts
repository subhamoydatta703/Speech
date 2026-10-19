import type { Readable } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import { transcriptionFields } from '@speech/contracts';
import { ApiError, abortError, untilAborted } from './errors';

/** Read a bounded upload into RAM. The caller must clear the returned audio after use. */
export async function readAudioUpload(request: FastifyRequest, signal: AbortSignal) {
  if (!request.isMultipart()) {
    throw new ApiError(415, 'INVALID_REQUEST', 'Use multipart/form-data with an audio file.');
  }

  let audio: Buffer | undefined;
  let activeFile: Readable | undefined;
  const fields: Record<string, string> = {};
  const stopReading = () => activeFile?.destroy(abortError(signal));
  signal.addEventListener('abort', stopReading, { once: true });

  async function readParts() {
    try {
      for await (const part of request.parts()) {
        signal.throwIfAborted();

        if (part.type === 'file') {
          if (part.fieldname !== 'audio' || audio) {
            part.file.resume();
            throw new ApiError(400, 'INVALID_REQUEST', 'Exactly one audio file is required.');
          }

          activeFile = part.file;
          audio = await part.toBuffer();
          signal.throwIfAborted();
          if (part.file.truncated) {
            throw new ApiError(413, 'AUDIO_TOO_LARGE', 'Audio exceeds the upload limit.');
          }
          continue;
        }

        const invalidField =
          part.fieldname !== 'sessionId' ||
          fields.sessionId !== undefined ||
          part.valueTruncated ||
          typeof part.value !== 'string';
        if (invalidField) {
          throw new ApiError(
            400,
            'INVALID_REQUEST',
            'Only an optional sessionId field is accepted.',
          );
        }
        fields.sessionId = part.value as string;
      }

      if (!audio) throw new ApiError(400, 'INVALID_REQUEST', 'The audio file is required.');
      return { audio, metadata: transcriptionFields.parse(fields) };
    } catch (error) {
      audio?.fill(0);
      throw error;
    }
  }

  try {
    return await untilAborted(readParts(), signal);
  } finally {
    signal.removeEventListener('abort', stopReading);
  }
}
