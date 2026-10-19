/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { errorMessage, isInstallationId } from "../src/lib/contracts";
describe("installation links", () => {
  test("accepts only an opaque 32-byte base64url identifier", () => {
    expect(isInstallationId("a".repeat(43))).toBe(true);
    for (const value of [
      undefined,
      [],
      "a".repeat(42),
      "../approve",
      "a".repeat(42) + "/",
      "a".repeat(44),
    ])
      expect(isInstallationId(value)).toBe(false);
  });
});
describe("backend errors", () => {
  test("supports both Clerk middleware and structured API errors", () => {
    expect(
      errorMessage({ success: false, message: "Sign in again" }, "Fallback"),
    ).toBe("Sign in again");
    expect(errorMessage({ error: { message: "Expired" } }, "Fallback")).toBe(
      "Expired",
    );
    expect(errorMessage(null, "Fallback")).toBe("Fallback");
    expect(errorMessage({ message: {} }, "Fallback")).toBe("Fallback");
  });
});
