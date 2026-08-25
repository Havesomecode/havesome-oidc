# Guided understanding pass — design contract

Status: approved by user feedback on 2026-08-25. This contract supersedes the earlier no-essay constraint for first-run orientation while preserving the synthetic/local-only and hands-on assessment boundaries.

## Problem observed on the live candidate

- A first-time learner lands inside a dense expert workbench without a clear start action or learning map.
- M0 is pre-solved, so “Check map” can pass without the learner understanding what changed.
- The compact layout turns the trust map into a compressed diagram whose channel labels disappear; the actor selector is separated from the visual by a fixed status/switcher rail.
- The site teaches invariants through gates, but it does not first build a mental model of scenarios, browser redirects, callback handling, or troubleshooting.

## Learning journey

The default route is a guided overview, not M0.

1. **Understand** — OAuth grants API access; OIDC adds an identity layer and an ID token. Show the five operational actors in plain language.
2. **Watch** — a selectable, learner-controlled workflow visualizer. Scenarios: server-rendered web app, browser SPA, native app, and OAuth-only API authorization.
3. **Diagnose redirect URIs** — three values remain visible together: registered URI, authorization-request `redirect_uri`, and callback actually reached. Show where exact matching is checked and why an invalid redirect must not be followed.
4. **Troubleshoot** — selectable cases with symptom, failed invariant, trace location, and next inspection step. Minimum cases: `redirect_uri_mismatch`, state/transaction loss, code redemption `invalid_grant`, issuer/audience mismatch, and browser/CORS or cookie boundary confusion.
5. **Practice** — one primary CTA enters M0, with a secondary deep link to Authorization Code + PKCE.

## Workflow visualizer

- No autoplay on initial load. `Play flow`, `Pause flow`, `Next step`, `Previous step`, and `Restart` are explicit controls.
- A short explanation accompanies each step; the active message is represented by position/weight and text, never color alone.
- Reduced motion changes steps without animated travel.
- Scenario changes reset to step 1 and update the actor layout, redirect form, token result, and “use this when” note.
- Implicit flow is not presented as a recommended modern scenario. PKCE S256 is visible for public clients and recommended for all client types.

## Redirect URI lens

- The callback is explained as the client endpoint, claimed HTTPS app link, private-use URI, or loopback listener that receives the authorization response through the user agent; it is not the token endpoint.
- Exact registered/requested matching is the default security rule. Native loopback redirect ports are explicitly identified as the narrow exception.
- The learner can select a case and run `Diagnose redirect`.
- The comparison explains that scheme, host, port, path, query, and encoding all matter; selected mismatch cases name the failed invariant and state whether the authorization server should redirect.
- Invalid redirect URIs never render a simulated redirect to the attacker-controlled value.

## First exercise repair

- M0 starts with at least one meaningful incorrect placement instead of a solved fixture.
- A visible three-step instruction strip says: select an actor, choose its zone, check the map.
- Compact mobile uses a readable lane/list representation and channel legend instead of the absolute-position desktop canvas.
- The primary control remains adjacent to the actor/zone representation; the fixed mobile status rail must not split the exercise.

## Accessibility and responsive acceptance

- Semantic page-level headings expose the guided sections and the PKCE practice title.
- Scenario tabs use native button/tab semantics and keyboard operation.
- Workflow status is in a polite live region; animation never creates repeated announcements.
- All controls remain at least 44 CSS px, 48 on coarse pointers.
- No horizontal overflow at 320–1920 px.
- Axe reports no serious violations in guide and practice modes, light and dark.
- The guide remains understandable with animation disabled and in monochrome.

## Verification

- Unit/component tests cover the default guide, scenario selection, workflow stepping, redirect diagnoses, and entry to M0/M1.
- Browser tests cover first-run orientation, mobile readability, reduced motion, keyboard control, and preservation of all existing eight milestone gates.
- Rendered screenshots are reviewed at 1440×1000 and 390×844 before release.
- Full `npm run check`, Playwright matrix, clean production build, static asset closure, and GitHub Pages subpath deployment must pass.

## Protocol basis

- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OAuth 2.0 Security BCP / RFC 9700: https://www.rfc-editor.org/rfc/rfc9700
- PKCE / RFC 7636: https://www.rfc-editor.org/rfc/rfc7636
- OAuth 2.0 for Native Apps / RFC 8252: https://www.rfc-editor.org/rfc/rfc8252
