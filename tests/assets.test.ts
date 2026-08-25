import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

describe('static asset closure', () => {
  it('ships every relative icon and manifest referenced by the source document', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');
    const hrefs = [...html.matchAll(/<link\b[^>]*\bhref="\.\/([^"?#]+)"/g)].map(
      (match) => match[1],
    );

    expect(hrefs).not.toHaveLength(0);
    for (const href of hrefs) {
      expect(
        existsSync(resolve('public', basename(href))),
        `missing public asset for ${href}`,
      ).toBe(true);
    }
  });
});
