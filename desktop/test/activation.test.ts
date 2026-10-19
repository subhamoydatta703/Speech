import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { activateInstallation } from "../src/auth/activation";

test("activation keeps the verifier out of the browser and proves it at exchange", async () => {
  let challenge = "",
    opened = "",
    displayed = "";
  const id = "a".repeat(43);
  const api = Bun.serve({
    port: 0,
    async fetch(request) {
      const body = (await request.json()) as any;
      if (new URL(request.url).pathname === "/v1/installations") {
        challenge = body.codeChallenge;
        expect(body.codeVerifier).toBeUndefined();
        return Response.json({
          id,
          confirmationCode: "ABCD-1234",
          expiresAt: Date.now() + 300000,
        });
      }
      expect(
        createHash("sha256").update(body.codeVerifier).digest("base64url"),
      ).toBe(challenge);
      return Response.json({
        status: "activated",
        user: { id: "test-user", email: "test@example.invalid" },
        activatedAt: Date.now(),
      });
    },
  });
  try {
    const activation = await activateInstallation(
      api.url.href,
      "https://speech.example",
      new AbortController().signal,
      (code) => {
        displayed = code;
      },
      async (url) => {
        opened = url;
      },
    );
    expect(displayed).toBe("ABCD-1234");
    expect(new URL(opened).pathname).toBe("/desktop/complete");
    expect([...new URL(opened).searchParams.keys()]).toEqual(["id"]);
    expect(activation.user.id).toBe("test-user");
  } finally {
    api.stop(true);
  }
});
test("cancelled activation never opens a browser", async () => {
  const controller = new AbortController();
  controller.abort();
  let opened = false;
  await expect(
    activateInstallation(
      "http://localhost:1",
      "https://speech.example",
      controller.signal,
      () => {},
      async () => {
        opened = true;
      },
    ),
  ).rejects.toThrow();
  expect(opened).toBe(false);
});
