import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isAuthConfigured } from "@/lib/auth-config";

/** Tokens stay on the Next.js server; the browser never receives backend credentials. */
export async function backendRequest(path: string, init: RequestInit = {}) {
  if (!isAuthConfigured())
    return Response.json(
      { message: "Sign-in is not configured yet." },
      { status: 503 },
    );
  const session = await auth();
  if (!session.userId)
    return Response.json(
      { message: "Please sign in to continue." },
      { status: 401 },
    );
  const token = await session.getToken();
  if (!token)
    return Response.json(
      { message: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  try {
    return await fetch(
      new URL(path, process.env.BACKEND_URL ?? "http://127.0.0.1:4000"),
      {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: init.signal ?? AbortSignal.timeout(15000),
      },
    );
  } catch {
    return Response.json(
      { message: "The service is unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
