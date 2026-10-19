import { test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('capture the current public onboarding journey for product review', async ({ page }) => {
  const folder = process.env.REVIEW_AFTER ? '../docs/product-review/after' : '../docs/product-review';
  await mkdir(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await writeFile(`${folder}/01-home-dom.txt`, await page.locator('body').ariaSnapshot());
  await page.screenshot({ path: `${folder}/01-home.png` });
  await page.getByRole('link', { name: /Get speech for Windows/i }).click();
  await page.getByRole('heading', { name: 'Sign-in is coming online.' }).waitFor();
  await page.screenshot({ path: `${folder}/02-download-gate.png` });
  await writeFile(`${folder}/02-download-dom.txt`, await page.locator('body').ariaSnapshot());
  await page.getByRole('link', { name: 'Help', exact: true }).click();
  await page.getByRole('heading', { name: 'A smoother start.' }).waitFor();
  await page.screenshot({ path: `${folder}/03-help.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: `${folder}/04-mobile-home.png` });
  await writeFile(`${folder}/04-mobile-dom.txt`, await page.locator('body').ariaSnapshot());
  await page.goto('/desktop/complete?id=invalid');
  await page.getByRole('heading', { name: 'Open this page from setup.' }).waitFor();
  await page.screenshot({ path: `${folder}/05-installation-recovery.png` });
});
