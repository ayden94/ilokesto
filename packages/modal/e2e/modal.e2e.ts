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

test('top-layer descendant and padding clicks keep the dialog open', async ({ page }) => {
  // Given
  await page.goto('/');
  await page.getByRole('button', { name: 'Open top-layer settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings dialog' });
  await expect(dialog).toHaveAccessibleDescription('Configure your modal preferences.');
  const dialogBox = await dialog.boundingBox();
  if (dialogBox === null) {
    throw new TypeError('Visible top-layer dialog has no bounding box.');
  }
  const contentBox = await page.getByRole('region', { name: 'Settings content' }).boundingBox();
  if (contentBox === null) {
    throw new TypeError('Visible top-layer content has no bounding box.');
  }
  const descendantBox = await page.getByRole('button', { name: 'Keep settings open' }).boundingBox();
  if (descendantBox === null) {
    throw new TypeError('Visible top-layer descendant has no bounding box.');
  }
  const paddingX = dialogBox.x + 16;
  const paddingY = dialogBox.y + 16;
  expect(paddingX).toBeGreaterThan(dialogBox.x);
  expect(paddingX).toBeLessThan(dialogBox.x + dialogBox.width);
  expect(paddingY).toBeGreaterThan(dialogBox.y);
  expect(paddingY).toBeLessThan(dialogBox.y + dialogBox.height);
  expect(paddingX).toBeLessThan(contentBox.x);
  expect(paddingY).toBeLessThan(contentBox.y);

  // When
  await page.mouse.click(
    descendantBox.x + descendantBox.width / 2,
    descendantBox.y + descendantBox.height / 2
  );
  await page.mouse.click(paddingX, paddingY);

  // Then
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Top-layer dismiss count: 0')).toBeVisible();
  await expect(page.getByText('Top-layer result: pending')).toBeVisible();
});

test('physical top-layer backdrop click dismisses exactly once', async ({ page }) => {
  // Given
  await page.goto('/');
  await page.getByRole('button', { name: 'Open top-layer settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings dialog' });
  const dialogBox = await dialog.boundingBox();
  if (dialogBox === null) {
    throw new TypeError('Visible top-layer dialog has no bounding box.');
  }

  // When
  await page.mouse.click(dialogBox.x - 16, dialogBox.y + dialogBox.height / 2);

  // Then
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Top-layer dismiss count: 1')).toBeVisible();
  await expect(page.getByText('Top-layer result: undefined')).toBeVisible();
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

test('inline backdrop and z-index stay local to each provider', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider inline' }).click();
  await page.getByRole('button', { name: 'Open second provider inline' }).dispatchEvent('click');

  const firstDialog = page.getByRole('dialog', { name: 'First provider inline modal' });
  const secondDialog = page.getByRole('dialog', { name: 'Second provider inline modal' });
  const firstWrapper = page.locator('.ilokesto-modal-inline-wrapper').filter({ has: firstDialog });
  const secondWrapper = page.locator('.ilokesto-modal-inline-wrapper').filter({ has: secondDialog });

  await expect(firstWrapper).toHaveCSS('z-index', '10000');
  await expect(secondWrapper).toHaveCSS('z-index', '10000');

  await firstWrapper.getByRole('button', { name: 'Dismiss modal' }).dispatchEvent('click');

  await expect(firstDialog).toBeHidden();
  await expect(secondDialog).toBeVisible();
});

test('Escape dismisses the top inline modal in each provider', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider inline' }).click();
  await page.getByRole('button', { name: 'Open second provider inline' }).dispatchEvent('click');

  const firstDialog = page.getByRole('dialog', { name: 'First provider inline modal' });
  const secondDialog = page.getByRole('dialog', { name: 'Second provider inline modal' });

  await page.keyboard.press('Escape');

  await expect(firstDialog).toBeHidden();
  await expect(secondDialog).toBeHidden();
});

test('focus wrapping remains inside the selected provider modal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider inline' }).click();
  await page.getByRole('button', { name: 'Open second provider inline' }).dispatchEvent('click');

  await page.getByRole('button', { name: 'First end' }).focus();
  await page.keyboard.press('Tab');

  await expect(page.getByRole('button', { name: 'First start' })).toBeFocused();
});

test('top-layer cancel only dismisses the provider that owns the dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider top layer' }).click();
  await page.getByRole('button', { name: 'Open second provider top layer' }).dispatchEvent('click');

  const firstDialog = page.getByRole('dialog', { name: 'First provider top-layer modal' });
  const secondDialog = page.getByRole('dialog', { name: 'Second provider top-layer modal' });

  await firstDialog.dispatchEvent('cancel');

  await expect(firstDialog).toBeHidden();
  await expect(secondDialog).toBeVisible();
});

test('physical Escape dismisses first-provider inline and second-provider top-layer modals', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider inline' }).click();
  await page.getByRole('button', { name: 'Open second provider top layer' }).dispatchEvent('click');

  const inlineDialog = page.getByRole('dialog', { name: 'First provider inline modal' });
  const topLayerDialog = page.getByRole('dialog', { name: 'Second provider top-layer modal' });

  await page.keyboard.press('Escape');

  await expect(inlineDialog).toBeHidden();
  await expect(topLayerDialog).toBeHidden();
});

test('physical Escape dismisses first-provider top-layer and second-provider inline modals', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open first provider top layer' }).click();
  await page.getByRole('button', { name: 'Open second provider inline' }).dispatchEvent('click');

  const topLayerDialog = page.getByRole('dialog', { name: 'First provider top-layer modal' });
  const inlineDialog = page.getByRole('dialog', { name: 'Second provider inline modal' });

  await page.keyboard.press('Escape');

  await expect(topLayerDialog).toBeHidden();
  await expect(inlineDialog).toBeHidden();
});
