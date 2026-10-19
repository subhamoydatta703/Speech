import { z } from "zod";

export const userSchema = z
  .object({
    id: z.string().startsWith("user_").max(191),
    email: z.string().email().max(254),
  })
  .strict();
export type User = z.infer<typeof userSchema>;
export const currentUserSchema = z.object({ user: userSchema }).strict();
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const installationStartSchema = z
  .object({
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export const installationApproveSchema = z
  .object({
    confirmationCode: z.string().regex(/^[A-F0-9]{4}-[A-F0-9]{4}$/),
  })
  .strict();
export const installationExchangeSchema = z
  .object({
    codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  })
  .strict();

/** Describes API responsibilities, not the readiness of a user's local model. */
export const capabilitiesSchema = z
  .object({
    sttMode: z.literal("local"),
    cloudTranscription: z.literal(false),
    storage: z
      .object({
        audio: z.literal(false),
        transcripts: z.literal(false),
        userFields: z.tuple([z.literal("id"), z.literal("email")]),
      })
      .strict(),
  })
  .strict();
export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const errorCodes = [
  "AUTH_REQUIRED",
  "INVALID_REQUEST",
  "RATE_LIMITED",
  "BUSY",
  "REQUEST_TIMEOUT",
  "CANCELLED",
  "ORIGIN_NOT_ALLOWED",
  "NOT_FOUND",
  "INTERNAL_ERROR",
  "DATABASE_UNAVAILABLE",
  "EMAIL_CLAIM_REQUIRED",
  "RELEASE_UNAVAILABLE",
  "INSTALLATION_EXPIRED",
  "INSTALLATION_CONFLICT",
  "INVALID_INSTALLATION_PROOF",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export type ApiErrorBody = {
  requestId: string;
  error: { code: ErrorCode; message: string; retryable: boolean };
};
