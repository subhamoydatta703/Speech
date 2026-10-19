import { backendRequest } from "@/lib/server/backend";
import { isInstallationId } from "@/lib/contracts";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = (message: string, status: number) =>
    Response.json(
      { message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("This request is not allowed.", 403);
  const { id } = await params;
  if (!isInstallationId(id)) return fail("Invalid installation link.", 400);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return fail("Expected JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) return fail("Missing confirmation.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      return fail("Request too large.", 413);
    }
    chunks.push(value);
  }
  let code: unknown;
  try {
    code = JSON.parse(Buffer.concat(chunks).toString("utf8")).confirmationCode;
  } catch {
    return fail("Invalid JSON.", 400);
  }
  if (typeof code !== "string" || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code))
    return fail("Invalid confirmation code.", 400);
  const response = await backendRequest(`/v1/installations/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmationCode: code }),
  });
  return Response.json(
    await response
      .json()
      .catch(() => ({ message: "Unexpected service response." })),
    { status: response.status, headers: { "Cache-Control": "no-store" } },
  );
}
