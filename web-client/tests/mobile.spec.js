const { expect, test } = require('@playwright/test');

const authQuery = '?mockView=chat&mockAuth=1&mockRole=ADMIN';

async function openMobileApp(page, path = '/app/groups') {
  await page.goto(`${path}${authQuery}`);
  await expect(page.getByTestId('mobile-app-shell')).toBeVisible();
}

test('mobile group channel navigation, composer, bottom sheet and browser back work', async ({ page }) => {
  await openMobileApp(page);
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  await page.locator('.mobile-list-card__main').filter({ hasText: 'Product and launch coordination' }).click();
  await expect(page).toHaveURL(/\/app\/groups\/g-product\/channels/);
  await expect(page.getByText('General')).toBeVisible();

  await page.locator('.mobile-list-card__main').filter({ hasText: 'General' }).first().click();
  await expect(page).toHaveURL(/\/app\/channels\/ch-general/);

  const composer = page.getByTestId('mobile-composer');
  await expect(composer).toBeVisible();
  await composer.getByLabel('Message').fill('Hello from mobile E2E');
  await composer.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Hello from mobile E2E')).toBeVisible();

  const box = await composer.boundingBox();
  const viewport = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

  await page.getByRole('button', { name: 'Open message actions' }).first().click();
  await expect(page.getByTestId('mobile-bottom-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('mobile-bottom-sheet')).toHaveCount(0);

  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/app\/groups\/g-product\/channels/);
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/channels\/ch-general/);
});

test('mobile readonly channel disables composer with visible reason', async ({ page }) => {
  await openMobileApp(page, '/app/groups/g-product/channels');
  await page.locator('.mobile-list-card__main').filter({ hasText: 'Announcements readonly channel' }).click();
  await expect(page).toHaveURL(/\/app\/channels\/ch-announcements/);
  await expect(page.getByText('This channel is readonly.')).toBeVisible();
  await expect(page.locator('textarea[aria-label="Message"]')).toBeDisabled();
});

test('mobile members and admin screens are reachable without horizontal scroll', async ({ page }) => {
  await openMobileApp(page, '/app/channels/ch-general');
  await page.getByRole('button', { name: 'Open related screen' }).click();
  await expect(page).toHaveURL(/\/app\/channels\/ch-general\/members/);
  await expect(page.getByText('Mira Moderator')).toBeVisible();

  await page.goto(`/app/admin/users${authQuery}`);
  await expect(page.getByText('Admin users')).toBeVisible();
  await expect(page.getByText('Former User')).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalScroll).toBe(false);
});
