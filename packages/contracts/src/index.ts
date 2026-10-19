import { z } from "zod";

/** Metadata is validated in transit only; the server does not save it. */
export const transcriptionFields = z
  .object({
    sessionId: z.string().uuid().optional(),
  })
  .strict();

export type TranscriptionResult = {
  requestId: string;
  sessionId?: string;
  text: string;
  model: string;
  audioDurationMs: number;
  processingDurationMs: number;
};

export const errorCodes = [
  "AUTH_REQUIRED",
  "INVALID_REQUEST",
  "INVALID_AUDIO",
  "AUDIO_TOO_LARGE",
  "NO_SPEECH",
  "RATE_LIMITED",
  "BUSY",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_TIMEOUT",
  "CANCELLED",
  "ORIGIN_NOT_ALLOWED",
  "NOT_FOUND",
  "INTERNAL_ERROR",
  "DATABASE_UNAVAILABLE",
  "EMAIL_CLAIM_REQUIRED",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export type ApiErrorBody = {
  requestId: string;
  error: { code: ErrorCode; message: string; retryable: boolean };
};
