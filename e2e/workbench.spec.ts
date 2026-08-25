import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const milestone = (page: import('@playwright/test').Page, id: string) =>
  page.getByRole('button', { name: new RegExp(`^${id}`) });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('keeps the simulation local, accessible, and explicit about decode limits', async ({
  page,
}) => {
  await expect(page.getByText('SYNTHETIC · LOCAL')).toBeVisible();
  await expect(page.getByText(/No real credentials or tokens/)).toBeVisible();
  await milestone(page, 'M3').click();
  await page.getByRole('button', { name: 'Decode for inspection' }).click();
  await expect(page.getByText('Decoded for inspection · Signature not verified')).toBeVisible();
  await expect(page.getByText('NOT VERIFIED', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('completes every milestone with pointer-free controls available', async ({ page }) => {
  await page.getByRole('button', { name: 'Check map' }).click();
  await expect(page.getByText('M0 · PASSED')).toBeVisible();

  await milestone(page, 'M1').click();
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByText('M1 · PASSED')).toBeVisible();

  await milestone(page, 'M2').click();
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByText('M2 · PASSED')).toBeVisible();

  await milestone(page, 'M3').click();
  await page.getByRole('button', { name: 'Decode for inspection' }).click();
  await page.getByLabel(/I understand/).check();
  await page.getByRole('button', { name: 'Accept inspection' }).click();
  await expect(page.getByText('M3 · PASSED')).toBeVisible();

  await milestone(page, 'M4').click();
  await page.getByRole('button', { name: 'Load local metadata' }).click();
  await page.getByRole('button', { name: 'Start local session' }).click();
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByText('M4 · PASSED')).toBeVisible();

  await milestone(page, 'M5').click();
  for (let index = 1; index <= 9; index += 1) {
    await page.getByRole('button', { name: new RegExp(`Challenge ${index}:`) }).click();
    await page.locator('.repair-toggle input').check();
    await page.getByRole('button', { name: 'Predict outcome' }).click();
    await expect(page.getByText('SAFE', { exact: true })).toBeVisible();
  }
  await expect(page.getByText('M5 · PASSED')).toBeVisible();

  await milestone(page, 'M6').click();
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByText('M6 · PASSED')).toBeVisible();

  await milestone(page, 'M7').click();
  await page
    .locator('.fault-grid input')
    .evaluateAll((inputs: HTMLInputElement[]) => inputs.forEach((input) => input.click()));
  await page.getByRole('button', { name: 'Run all checks' }).click();
  await expect(page.getByText('M7 · PASSED')).toBeVisible();
  await expect(page.getByText('8/8 gates')).toBeVisible();
});

test('has no page-level overflow across required responsive widths', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Responsive matrix is covered in Chromium; functional flow is cross-engine.',
  );
  for (const width of [360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        { message: `horizontal overflow at ${width}px` },
      )
      .toBe(true);
  }
});

test('preserves state and focus with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await milestone(page, 'M1').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Authorization Code + PKCE', level: 1 }),
  ).toBeVisible();
  const motion = await page
    .locator('.status-dot')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe('none');
  await page.getByRole('button', { name: /Move GET \/authorize down/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('sequence-message').nth(1)).toContainText('GET /authorize');
});

test('keeps skip navigation and dark theme accessible', async ({ page, browserName }) => {
  if (browserName !== 'webkit') {
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await skip.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  }
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('reloads its previously loaded shell offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service-worker offline probe runs in Chromium.');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cast + trust map', level: 1 })).toBeVisible();
});
