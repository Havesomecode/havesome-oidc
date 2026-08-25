import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('public/oidc-field-cheat-sheet.pdf');
const server = await createServer({
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
});

let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'OIDC field cheat sheet' }).waitFor();
  await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });
  await page.pdf({
    path: output,
    format: 'A4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
  });

  const signature = (await readFile(output)).subarray(0, 5).toString('ascii');
  if (signature !== '%PDF-') throw new Error(`Unexpected PDF signature: ${signature}`);
  console.log(`Generated ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
