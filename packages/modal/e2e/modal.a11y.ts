import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('inline modal has no detectable axe violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open inline confirm' }).click();

  await expect(page.getByRole('dialog', { name: 'Delete item?' })).toBeVisible();

  const results = await new AxeBuilder({ page }).include('body').analyze();

  expect(results.violations).toEqual([]);
});

test('top-layer modal has no detectable axe violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open top-layer settings' }).click();

  await expect(page.getByRole('dialog', { name: 'Settings dialog' })).toBeVisible();

  const results = await new AxeBuilder({ page }).include('body').analyze();

  expect(results.violations).toEqual([]);
});
