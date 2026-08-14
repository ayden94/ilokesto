import { expect, test } from '@playwright/test';

test('inline modal resolves with scoped close and restores focus', async ({ page }) => {
  await page.goto('/');

  const opener = page.getByRole('button', { name: 'Open inline confirm' });
  await opener.click();

  await expect(page.getByRole('dialog', { name: 'Delete item?' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Delete item?' })).toHaveAccessibleDescription(
    'This action cannot be undone.'
  );

  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Inline result: true')).toBeVisible();
  await expect(opener).toBeFocused();
});

test('stacked inline modals only dismiss the top modal on Escape', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open stacked modals' }).click();
  await expect(page.getByRole('dialog', { name: 'Outer modal' })).toBeVisible();

  await page.getByRole('button', { name: 'Open inner modal' }).click();
  await expect(page.getByRole('dialog', { name: 'Inner modal' })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog', { name: 'Inner modal' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Outer modal' })).toBeVisible();
});

test('top-layer dialog opens and resolves in a real browser', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open top-layer settings' }).click();

  await expect(page.getByRole('dialog', { name: 'Settings dialog' })).toBeVisible();
  await page.getByRole('button', { name: 'Save settings' }).click();

  await expect(page.getByText('Top-layer result: true')).toBeVisible();
});

test('reduced motion disables modal animation on first render', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open inline confirm' }).click();

  const animationDuration = await page
    .getByRole('dialog', { name: 'Delete item?' })
    .evaluate((element) => getComputedStyle(element).animationDuration);

  expect(animationDuration).toBe('0s');
});
