import { expect, test } from "@playwright/test";

test("landing page works on desktop and mobile without overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Help', exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Big thoughts.Less typing.",
    );
    await page.getByRole("button", { name: /Play preview/ }).click();
    await expect(
      page.getByRole("button", { name: /Pause preview/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .locator('summary').filter({ hasText: "Will it work without internet?" })
      .click();
    await expect(
      page.getByText("The planned desktop experience runs offline", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("unconfigured auth fails closed for account and downloads", async ({
  page,
  request,
}) => {
  for (const path of ["/download", "/account"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Sign-in is coming online." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download installer/ }),
    ).toHaveCount(0);
  }
  const download = await request.get("/api/download");
  expect(download.status()).toBe(503);
  expect(download.headers()["cache-control"]).toContain("no-store");
  expect(download.headers()["content-disposition"]).toBeUndefined();
});

test("rejects invalid installation links and cross-origin approval", async ({
  page,
  request,
}) => {
  await page.goto("/desktop/complete?id=invalid");
  await expect(page.getByRole('link', { name: 'Get setup help' })).toHaveAttribute('href', '/help');
  await expect(
    page.getByRole("heading", { name: "Open this page from setup." }),
  ).toBeVisible();
  const response = await request.post(
    `/api/installations/${"a".repeat(43)}/approve`,
    {
      headers: { Origin: "https://unrelated.example" },
      data: { confirmationCode: "ABCD-1234" },
    },
  );
  expect(response.status()).toBe(403);
});
