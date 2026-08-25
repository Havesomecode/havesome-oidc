import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const milestone = (page: import('@playwright/test').Page, id: string) =>
  page.getByRole('button', { name: new RegExp(`^${id}`) });

const enterPractice = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Enter practice lab' }).click();

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

const visibleControlGeometry = (page: import('@playwright/test').Page, minimum: number) =>
  page
    .locator('button:visible, input:visible, select:visible, textarea:visible')
    .evaluateAll((controls, targetMinimum) => {
      const kinds = new Set<string>();
      const undersized = controls.flatMap((control) => {
        const labels = control instanceof HTMLInputElement ? control.labels : null;
        const isChoice =
          control instanceof HTMLInputElement &&
          (control.type === 'checkbox' || control.type === 'radio');
        const target = isChoice ? (labels?.[0] ?? control) : control;
        const rect = target.getBoundingClientRect();
        const kind =
          control instanceof HTMLInputElement
            ? `input:${control.type || 'text'}`
            : control.tagName.toLowerCase();
        kinds.add(kind);

        return rect.width < targetMinimum || rect.height < targetMinimum
          ? [
              {
                kind,
                label:
                  control.getAttribute('aria-label') ??
                  labels?.[0]?.textContent?.trim() ??
                  control.textContent?.trim(),
                width: rect.width,
                height: rect.height,
              },
            ]
          : [];
      });

      return { kinds: [...kinds], undersized };
    }, minimum);

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('orients a first-time learner before practice on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole('heading', { name: 'Understand OIDC before you wire it', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /OAuth grants access/ })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.getByRole('status', { name: 'Workflow step' })).toContainText('Step 1');
  await page.waitForTimeout(2000);
  await expect(page.getByRole('status', { name: 'Workflow step' })).toContainText('Step 1');
  await expect(page.getByRole('button', { name: 'Enter practice lab' })).toBeVisible();
});

test('makes the field cheat sheet easy to reach and download', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const shortcut = page.getByRole('link', { name: /open the oidc field cheat sheet/i });
  await expect(shortcut).toBeVisible();
  await shortcut.click();

  await expect(page.getByRole('heading', { name: 'OIDC field cheat sheet' })).toBeInViewport();
  const mobileGeometry = await page.evaluate(() => ({
    headingTop: document.querySelector('#cheat-sheet-title')!.getBoundingClientRect().top,
    navigationBottom: document.querySelector('.journey-map')!.getBoundingClientRect().bottom,
    sheetWidth: document.querySelector('.cheat-sheet-section')!.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(mobileGeometry.headingTop).toBeGreaterThanOrEqual(mobileGeometry.navigationBottom);
  expect(mobileGeometry.sheetWidth).toBeLessThanOrEqual(mobileGeometry.viewportWidth);
  const download = page.getByRole('link', { name: /download.*pdf/i });
  await expect(download).toHaveAttribute('download', 'oidc-field-cheat-sheet.pdf');

  const response = await page.request.get('./oidc-field-cheat-sheet.pdf');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect((await response.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
});

test('supports scenario keyboard controls and resets the workflow', async ({ page }) => {
  const server = page.getByRole('tab', { name: 'Server web app' });
  await server.focus();
  await page.keyboard.press('ArrowRight');
  const spa = page.getByRole('tab', { name: 'Browser SPA' });
  await expect(spa).toBeFocused();
  await expect(spa).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByRole('status', { name: 'Workflow step' })).toContainText('Step 2');
  await page.getByRole('tab', { name: 'Native app' }).click();
  await expect(page.getByRole('status', { name: 'Workflow step' })).toContainText('Step 1');
  await expect(
    page.getByRole('listitem').getByText('External browser', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Claimed HTTPS app link · private-use and loopback are alternatives', {
      exact: true,
    }),
  ).toBeVisible();
});

test('animates an actor graph and diagnoses redirect mismatch dimensions', async ({ page }) => {
  await page.goto('./');
  const graph = page.getByRole('group', { name: 'Server web app actor graph' });
  await expect(graph).toBeVisible();
  await expect(graph.getByText('Active message · Web server → Browser')).toBeVisible();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(graph.getByText('Active message · Browser → OpenID Provider')).toBeVisible();

  for (const [caseName, dimension] of [
    ['Scheme mismatch', 'scheme'],
    ['Host mismatch', 'host'],
    ['Port mismatch', 'port'],
    ['Path mismatch', 'path'],
    ['Query mismatch', 'query'],
    ['Encoding mismatch', 'encoding'],
  ]) {
    await page.getByRole('button', { name: caseName, exact: true }).click();
    await page.getByRole('button', { name: 'Diagnose redirect' }).click();
    const result = page.getByRole('status', { name: 'Redirect diagnosis' });
    await expect(result).toContainText('redirect_uri_mismatch');
    await expect(result).toContainText(dimension);
    await expect(result).toContainText('Do not redirect');
  }
});

test('diagnoses an unsafe redirect without simulating the redirect', async ({ page }) => {
  await page.getByRole('button', { name: 'Path mismatch' }).click();
  await page.getByRole('button', { name: 'Diagnose redirect' }).click();
  const result = page.getByRole('status', { name: 'Redirect diagnosis' });
  await expect(result).toContainText('redirect_uri_mismatch');
  await expect(result).toContainText('path');
  await expect(result).toContainText('Do not redirect');
  await expect(page.getByText('No callback followed')).toBeVisible();
});

test('uses no animated travel for guide steps with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByRole('status', { name: 'Workflow step' })).toContainText('Step 2');
  const transitionDuration = await page
    .locator('.workflow-track li.active')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration).toBe('0s');
});

test('keeps first-run orientation and M0 lanes readable on mobile', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Mobile layout is covered once in Chromium.');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('heading', { name: 'Understand OIDC before you wire it', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Guided learning sections' })).toBeVisible();
  await enterPractice(page);
  await expect(page.getByText('1. Select an actor')).toBeVisible();
  await expect(page.locator('.actor-zone').first()).toBeVisible();
  await expect(page.locator('.channel-legend')).toBeVisible();
  await expect(page.locator('.browser-boundary')).toBeHidden();
  await expect(page.locator('.mobile-switcher')).toHaveCSS('position', 'static');
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test('keeps visible controls at 44px and 48px on coarse pointers', async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Control geometry is covered once in Chromium.');
  test.slow();
  await enterPractice(page);
  const desktopKinds = new Set<string>();
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']) {
      await milestone(page, id).click();
      const geometry = await visibleControlGeometry(page, 44);
      geometry.kinds.forEach((kind) => desktopKinds.add(kind));
      expect(geometry.undersized, `${id} desktop control targets at ${width}px`).toEqual([]);
    }
    await page.getByRole('button', { name: 'Reset all' }).click();
    const dialogGeometry = await visibleControlGeometry(page, 44);
    dialogGeometry.kinds.forEach((kind) => desktopKinds.add(kind));
    expect(dialogGeometry.undersized, `desktop reset dialog control targets at ${width}px`).toEqual(
      [],
    );
    await page.keyboard.press('Escape');
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await context.newPage();
  await mobile.goto(new URL('/', page.url()).toString());
  await mobile.getByRole('button', { name: 'Enter practice lab' }).click();
  const coarseKinds = new Set<string>();
  for (const width of [320, 390]) {
    await mobile.setViewportSize({ width, height: 844 });
    for (const id of ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']) {
      await milestone(mobile, id).click();
      const geometry = await visibleControlGeometry(mobile, 48);
      geometry.kinds.forEach((kind) => coarseKinds.add(kind));
      expect(geometry.undersized, `${id} coarse-pointer control targets at ${width}px`).toEqual([]);
    }
    await mobile.getByRole('button', { name: 'Reset all' }).click();
    const dialogGeometry = await visibleControlGeometry(mobile, 48);
    dialogGeometry.kinds.forEach((kind) => coarseKinds.add(kind));
    expect(
      dialogGeometry.undersized,
      `coarse-pointer reset dialog control targets at ${width}px`,
    ).toEqual([]);
    await mobile.keyboard.press('Escape');
  }

  const intendedKinds = ['button', 'input:checkbox', 'input:text', 'select', 'textarea'];
  expect([...desktopKinds].sort()).toEqual(intendedKinds);
  expect([...coarseKinds].sort()).toEqual(intendedKinds);
  await context.close();
});

test('keeps the simulation local, accessible, and explicit about decode limits', async ({
  page,
}) => {
  test.slow();
  await expect(page.getByText('SYNTHETIC · LOCAL')).toBeVisible();
  await expect(page.getByText(/No real credentials or tokens/)).toBeVisible();
  const guideResults = await new AxeBuilder({ page }).analyze();
  expect(guideResults.violations).toEqual([]);
  await enterPractice(page);
  await milestone(page, 'M3').click();
  await page.getByRole('button', { name: 'Decode for inspection' }).click();
  await expect(page.getByText('Decoded for inspection · Signature not verified')).toBeVisible();
  await expect(page.getByText('NOT VERIFIED', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('completes every milestone with pointer-free controls available', async ({ page }) => {
  test.slow();
  await enterPractice(page);
  await page.getByLabel(/Move Client to zone/).selectOption('Trusted application');
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

test.describe('Chromium-only responsive coverage', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Responsive matrix is covered in Chromium; functional flow is cross-engine.',
  );

  test('has no page-level overflow across required responsive widths', async ({ page }) => {
    for (const width of [320, 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920]) {
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
    await enterPractice(page);
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            ),
          { message: `practice horizontal overflow at ${width}px` },
        )
        .toBe(true);
    }
  });
});

test('keeps desktop headings below the sticky header after pointer milestone selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterPractice(page);
  await milestone(page, 'M5').click();

  await expect(page.getByRole('heading', { name: 'Threat arcade', level: 1 })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
  await expectDesktopHeadingsBelowHeader(page);
});

test('keeps desktop headings below the sticky header after keyboard milestone selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterPractice(page);
  await milestone(page, 'M5').press('Enter');

  await expect(page.getByRole('heading', { name: 'Threat arcade', level: 1 })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
  await expectDesktopHeadingsBelowHeader(page);
});

for (const { width, interaction } of [
  { width: 390, interaction: 'pointer' },
  { width: 320, interaction: 'keyboard' },
] as const) {
  test(`natively focuses the task heading below the mobile rail after ${interaction} selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await enterPractice(page);
    await milestone(page, 'M5').click();
    await page.evaluate(() => window.scrollTo(0, 1000));

    const target = milestone(page, 'M4');
    if (interaction === 'pointer') await target.click();
    else await target.press('Enter');

    const heading = page.getByRole('heading', { name: 'OIDC identity lab', level: 1 });
    await expect(heading).toBeFocused();

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.querySelector('.task-header h1')!.getBoundingClientRect().top -
              document.querySelector('.milestone-rail')!.getBoundingClientRect().bottom,
          ),
        { message: 'selected task heading clears the sticky rail' },
      )
      .toBeGreaterThanOrEqual(0);
  });
}

test('preserves state and focus with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterPractice(page);
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
  await enterPractice(page);
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
  const guideResults = await new AxeBuilder({ page }).analyze();
  expect(guideResults.violations).toEqual([]);
  await enterPractice(page);
  const practiceResults = await new AxeBuilder({ page }).analyze();
  expect(practiceResults.violations).toEqual([]);
});

test('reloads its previously loaded shell offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service-worker offline probe runs in Chromium.');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Understand OIDC before you wire it', level: 1 }),
  ).toBeVisible();
});
