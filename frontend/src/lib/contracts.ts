export function isInstallationId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const value = body as { message?: unknown; error?: { message?: unknown } };
  const message = value.error?.message ?? value.message;
  return typeof message === "string" ? message : fallback;
}
