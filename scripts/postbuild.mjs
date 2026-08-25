import { access, readFile, writeFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
if (!html.includes('./assets/') && !html.includes('assets/')) {
  throw new Error('Expected GitHub Pages-safe relative asset references.');
}

const localLinks = [...html.matchAll(/<link\b[^>]*\bhref="\.\/([^"?#]+)"/g)].map(
  (match) => match[1],
);
await Promise.all(localLinks.map((href) => access(`dist/${href}`)));

const notFound = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Return to Protocol Workbench</title>
  </head>
  <body>
    <p>Returning to Protocol Workbench…</p>
    <script>
      const parts = location.pathname.split('/').filter(Boolean);
      const base = location.hostname.endsWith('github.io') && parts.length ? '/' + parts[0] + '/' : '/';
      location.replace(base);
    </script>
    <noscript>This route does not exist. Open the site root to continue.</noscript>
  </body>
</html>
`;

await writeFile('dist/404.html', notFound);
await writeFile('dist/.nojekyll', '');
