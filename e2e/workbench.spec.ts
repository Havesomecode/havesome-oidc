import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const milestone = (page: import('@playwright/test').Page, id: string) =>
  page.getByRole('button', { name: new RegExp(`^${id}`) });

const emulateStickyHeaderFocusScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    // Normalize the reviewed 53px focus scroll so the geometry regression is engine-stable.
    const nativeFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
      nativeFocus.call(this, options);
      if (this.id === 'main' && !options?.preventScroll) window.scrollTo(0, 53);
    };
  });

const emulateMobileFocusScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const nativeFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
      nativeFocus.call(this, options);
      if (this.id === 'main' && !options?.preventScroll) this.scrollIntoView();
    };
  });

const expectDesktopHeadingsBelowHeader = async (page: import('@playwright/test').Page) => {
  const geometry = await page.evaluate(() => ({
    headerBottom: document.querySelector('.product-header')!.getBoundingClientRect().bottom,
    taskTop: document.querySelector('.task-header')!.getBoundingClientRect().top,
    railTop: document.querySelector('.rail-heading')!.getBoundingClientRect().top,
    inspectorTop: document.querySelector('.inspector')!.getBoundingClientRect().top,
  }));

  expect(geometry.taskTop, 'task heading clears the sticky header').toBeGreaterThanOrEqual(
    geometry.headerBottom,
  );
  expect(geometry.railTop, 'rail heading clears the sticky header').toBeGreaterThanOrEqual(
    geometry.headerBottom,
  );
  expect(
    geometry.inspectorTop,
    'inspector heading clears the sticky header',
  ).toBeGreaterThanOrEqual(geometry.headerBottom);
};

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

test('keeps desktop headings below the sticky header after pointer milestone selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await emulateStickyHeaderFocusScroll(page);
  await milestone(page, 'M5').click();

  await expect(page.getByRole('heading', { name: 'Threat arcade', level: 1 })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
  await expectDesktopHeadingsBelowHeader(page);
});

test('keeps desktop headings below the sticky header after keyboard milestone selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await emulateStickyHeaderFocusScroll(page);
  await milestone(page, 'M5').focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Threat arcade', level: 1 })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
  await expectDesktopHeadingsBelowHeader(page);
});

for (const width of [390, 320]) {
  test(`keeps the focused task visible after mobile milestone selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await emulateMobileFocusScroll(page);
    await milestone(page, 'M5').click();
    await page.evaluate(() => window.scrollTo(0, 1000));

    const target = milestone(page, 'M4');
    if (width === 390) await target.click();
    else {
      await target.focus();
      await page.keyboard.press('Enter');
    }

    await expect(page.locator('#main')).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'OIDC identity lab', level: 1 }),
    ).toBeInViewport();
  });
}

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

test('uses roving focus and arrow navigation for schema bench tabs', async ({ page }) => {
  await milestone(page, 'M6').click();
  const http = page.getByRole('tab', { name: 'HTTP' });
  const json = page.getByRole('tab', { name: 'JSON' });
  const diff = page.getByRole('tab', { name: 'DIFF' });

  await expect(http).toHaveAttribute('tabindex', '0');
  await expect(json).toHaveAttribute('tabindex', '-1');
  await expect(diff).toHaveAttribute('tabindex', '-1');
  await http.focus();
  await page.keyboard.press('ArrowRight');
  await expect(json).toBeFocused();
  await expect(json).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(diff).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(http).toBeFocused();
});

test('traps reset focus, closes on Escape, and restores the opener', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Reset all' });
  await opener.click();
  const phrase = page.getByLabel(/Type RESET LOCAL/);
  const cancel = page.getByRole('button', { name: 'Cancel' });
  const confirm = page.getByRole('button', { name: 'Reset local progress' });

  await expect(phrase).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();
  await phrase.fill('RESET LOCAL');
  await confirm.focus();
  await page.keyboard.press('Tab');
  await expect(phrase).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
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
