# Protocol Workbench

A static, local-only OAuth 2.0 and OpenID Connect learning instrument. Learners assemble, inspect, break, and repair synthetic protocol traces across eight milestones.

## Safety boundary

- No login, analytics, API, issuer, or remote runtime dependency.
- Every fixture uses `*.local`, `api://notes`, and visibly synthetic identifiers.
- JWT decoding is inspection only. The app never claims cryptographic signature verification.
- Progress and preferences stay in browser `localStorage`.

## Run

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

The field cheat sheet is rendered from the guide itself. After changing its content or print styles,
regenerate the committed download with `npm run cheatsheet:pdf` and verify that it remains one A4
landscape page.

`npm run build` creates `dist/`, a route-safe `404.html`, `.nojekyll`, manifest, and offline shell. GitHub Actions verifies the candidate before uploading the Pages artifact. It does not use secrets or real OAuth credentials.

## Learning targets

OAuth 2.0 RFC 6749, PKCE RFC 7636, Authorization Server Metadata RFC 8414, JWT RFC 7519, OpenID Connect Core 1.0, and OAuth 2.0 Security Best Current Practice RFC 9700.
