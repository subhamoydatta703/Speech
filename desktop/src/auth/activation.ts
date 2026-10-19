import { randomBytes, createHash } from "node:crypto";
import type { Activation } from "../shared/types";

async function post(
  api: string,
  path: string,
  body: object,
  signal: AbortSignal,
) {
  return fetch(new URL(path, api), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(75000)]),
  });
}
export async function activateInstallation(
  api: string,
  website: string,
  signal: AbortSignal,
  showCode: (code: string) => void,
  openBrowser: (url: string) => Promise<void>,
): Promise<Activation> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const start = await post(
    api,
    "/v1/installations",
    { codeChallenge: challenge },
    signal,
  );
  if (!start.ok)
    throw new Error(
      "Setup could not connect to your account service. Try again shortly.",
    );
  const transaction = (await start.json()) as {
    id: string;
    confirmationCode: string;
    expiresAt: number;
  };
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(transaction.id) ||
    !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(transaction.confirmationCode) ||
    !Number.isFinite(transaction.expiresAt)
  )
    throw new Error("The account service returned an invalid setup request.");
  showCode(transaction.confirmationCode);
  const url = new URL("/desktop/complete", website);
  url.searchParams.set("id", transaction.id);
  await openBrowser(url.href);
  const deadline = Math.min(transaction.expiresAt, Date.now() + 300000);
  let interval = 3000;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("Installation confirmation cancelled."));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, interval);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    const response = await post(
      api,
      `/v1/installations/${transaction.id}/exchange`,
      { codeVerifier: verifier },
      signal,
    );
    if (response.status === 202 || response.status === 429) {
      interval = Math.min(
        30000,
        Math.max(
          3000,
          Number(response.headers.get("retry-after") ?? 3) * 1000 || 3000,
        ),
      );
      continue;
    }
    if (!response.ok)
      throw new Error(
        "This installation request expired or was interrupted. Start confirmation again.",
      );
    const value = (await response.json()) as Activation & { status: string };
    if (
      value.status !== "activated" ||
      typeof value.user?.id !== "string" ||
      typeof value.user?.email !== "string" ||
      !Number.isFinite(value.activatedAt)
    )
      throw new Error("The account service returned an invalid activation.");
    signal.throwIfAborted();
    return {
      user: { id: value.user.id, email: value.user.email },
      activatedAt: value.activatedAt,
    };
  }
  throw new Error("The confirmation code expired. Start confirmation again.");
}
