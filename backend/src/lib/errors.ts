import type { ApiErrorBody, ErrorCode } from '@speech/contracts';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

export function errorBody(error: ApiError, requestId: string): ApiErrorBody {
  return {
    requestId,
    error: { code: error.code, message: error.message, retryable: error.retryable },
  };
}

export function abortError(signal: AbortSignal): ApiError {
  return signal.reason instanceof ApiError
    ? signal.reason
    : new ApiError(499, 'CANCELLED', 'The request was cancelled.');
}

/** Bounds the response wait; database queries also have their own driver timeouts. */
export async function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, cancelled]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}
