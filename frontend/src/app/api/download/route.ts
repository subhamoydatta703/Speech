import { backendRequest } from "@/lib/server/backend";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function download(request: Request) {
  const upstream = await backendRequest("/v1/downloads/windows", {
    method: request.method,
    signal: request.signal,
  });
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (!upstream.ok) {
    return new Response(
      request.method === "HEAD"
        ? null
        : "The download is unavailable. Return to /download and try again.",
      { status: upstream.status, headers },
    );
  }
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", 'attachment; filename="Speech-Setup.exe"');
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  // Stream the installer, rather than buffering a potentially large file in memory.
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
export const GET = download;
export const HEAD = download;
