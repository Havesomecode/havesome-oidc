import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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

  it('ships the linked one-page cheat sheet as a cached, tagged PDF asset', async () => {
    const pdfPath = resolve('public', 'oidc-field-cheat-sheet.pdf');
    const serviceWorker = readFileSync(resolve('public', 'sw.js'), 'utf8');

    expect(existsSync(pdfPath)).toBe(true);
    const pdf = readFileSync(pdfPath);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
    expect(document.numPages).toBe(1);

    const metadata = await document.getMetadata();
    const info = metadata.info as { Title?: string; Language?: string };
    expect(info.Title).toBe('OIDC field cheat sheet — Protocol Workbench');
    expect(info.Language).toBe('en');

    const page = await document.getPage(1);
    const structure = await page.getStructTree();
    expect(structure?.children.length).toBeGreaterThan(0);

    const text = await page.getTextContent({ includeMarkedContent: true });
    const contentById = new Map<string, string>();
    const markedContentStack: string[] = [];
    for (const item of text.items) {
      if ('type' in item) {
        if (item.type === 'beginMarkedContentProps') markedContentStack.push(item.id);
        if (item.type === 'endMarkedContent') markedContentStack.pop();
        continue;
      }
      const id = markedContentStack.at(-1);
      if (id) contentById.set(id, `${contentById.get(id) ?? ''}${item.str}`);
    }
    type StructureNode = { type?: string; id?: string; children?: StructureNode[] };
    const readStructure = (node: StructureNode): string => {
      if (node.type === 'content' && node.id) return contentById.get(node.id) ?? '';
      return (node.children ?? []).map(readStructure).join(' ');
    };
    const strings = readStructure(structure as StructureNode).replace(/\s+/g, ' ');
    const orderedContent = [
      'OIDC field cheat sheet',
      'What each part is',
      'Authorization Code + PKCE flow',
      'Create transaction',
      'Validate + use',
      'ID token validation',
      'Troubleshooting order',
    ];
    let previous = -1;
    for (const content of orderedContent) {
      const index = strings.indexOf(content);
      expect(index, `missing or misordered PDF content: ${content}`).toBeGreaterThan(previous);
      previous = index;
    }

    const renderedText = text.items.filter((item) => 'str' in item && item.str.trim().length > 0);
    const bodyText = renderedText.filter(
      (item) => 'str' in item && !item.str.includes('Protocol Workbench · OAuth 2.0'),
    );
    for (const item of bodyText) {
      if (!('transform' in item)) continue;
      const fontSize = Math.hypot(item.transform[2], item.transform[3]);
      expect(
        fontSize,
        `PDF text below 8pt: ${'str' in item ? item.str : ''}`,
      ).toBeGreaterThanOrEqual(7.95);
    }

    expect(serviceWorker).toContain("'./oidc-field-cheat-sheet.pdf'");
  });
});

describe('contrast-safe motion', () => {
  it('keeps active-message colors fully opaque throughout the arrival animation', () => {
    const css = readFileSync(resolve('src/styles.css'), 'utf8');
    const animation = css.match(/@keyframes message-arrive\s*\{[\s\S]*?\n\}/)?.[0];

    expect(animation).toBeDefined();
    expect(animation).not.toMatch(/\bopacity\s*:/);
  });
});
