---
version: alpha
name: Protocol Workbench
description: Monochrome-first instrument UI for learning OAuth 2.0 and OpenID Connect through direct manipulation.
colors:
  primary: "oklch(22% 0.02 240)"
  secondary: "oklch(50% 0.018 240)"
  tertiary: "oklch(58% 0.16 145)"
  bg: "oklch(98% 0.005 250)"
  surface: "oklch(100% 0 0)"
  fg: "oklch(22% 0.02 240)"
  muted: "oklch(50% 0.018 240)"
  border: "oklch(90% 0.008 240)"
  accent: "oklch(50% 0.16 145)"
  accent-on: "oklch(99% 0.005 145)"
  accent-soft: "oklch(94% 0.045 145)"
  success: "oklch(49% 0.14 145)"
  success-soft: "oklch(95% 0.035 145)"
  warning: "oklch(50% 0.13 78)"
  warning-soft: "oklch(95% 0.045 78)"
  error: "oklch(49% 0.19 28)"
  error-soft: "oklch(95% 0.04 28)"
  focus: "oklch(48% 0.18 245)"
  dark-bg: "oklch(16% 0.018 240)"
  dark-surface: "oklch(21% 0.02 240)"
  dark-fg: "oklch(94% 0.008 240)"
  dark-muted: "oklch(73% 0.018 240)"
  dark-border: "oklch(36% 0.018 240)"
  dark-accent: "oklch(73% 0.16 145)"
  dark-accent-on: "oklch(16% 0.018 145)"
  dark-success: "oklch(74% 0.14 145)"
  dark-warning: "oklch(79% 0.13 78)"
  dark-error: "oklch(72% 0.18 28)"
  dark-focus: "oklch(78% 0.14 245)"
typography:
  display-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 720
    lineHeight: 1.05
    letterSpacing: -0.035em
  heading-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 680
    lineHeight: 1.15
    letterSpacing: -0.02em
  heading-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.01em
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 450
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 450
    lineHeight: 1.45
    letterSpacing: 0em
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
  code:
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: 0em
    fontFeature: "'liga' 0, 'calt' 0, 'zero' 1"
spacing:
  0: 0px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  touch: 44px
  content-max: 1440px
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  pill: 999px
components:
  border-hairline:
    backgroundColor: "{colors.border}"
    width: 1px
    height: 1px
  border-structural:
    backgroundColor: "{colors.fg}"
    width: 2px
    height: 2px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "oklch(44% 0.16 145)"
    textColor: "{colors.accent-on}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
  actor-node:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    size: 64px
  message-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.xs}"
    padding: 8px
  inspector:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    width: 360px
  threat-compromised:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
  status-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.fg}"
  status-pending:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
  status-disabled:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.muted}"
  selected-message:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.fg}"
  theme-dark-canvas:
    backgroundColor: "{colors.dark-bg}"
    textColor: "{colors.dark-fg}"
  theme-dark-surface:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-fg}"
  theme-dark-muted:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-muted}"
  theme-dark-border:
    backgroundColor: "{colors.dark-border}"
    height: 1px
  theme-dark-accent:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-accent-on}"
  theme-dark-success:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-success}"
  theme-dark-warning:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-warning}"
  theme-dark-error:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-error}"
  theme-dark-focus:
    backgroundColor: "{colors.dark-focus}"
    size: 3px
---

# Protocol Workbench design system

## Overview

Protocol Workbench feels like a network-analysis instrument made approachable for active learning. It is dense, direct, and inspectable without becoming a terminal cosplay. The memorable flourish is a routing field where messages cross visibly labeled trust boundaries; the same grammar appears in canvases, traces, tokens, and threat outcomes.

The product is for learners who know basic web concepts and need operational understanding of OAuth 2.0 and OpenID Connect. It rewards experimentation, makes server checks visible, and never presents synthetic material as production-safe.

Five visual rules define the language:

1. Use open work surfaces separated by rules, not a dashboard of floating cards.
2. Reserve the accent for the current learning action or active route, at most twice per viewport.
3. Pair every state color with text, a glyph, a border style, or a pattern.
4. Render protocol data in mono with preserved punctuation and user-controlled wrapping.
5. Make trust boundaries and message direction more prominent than decorative chrome.

## Colors

The six seed tokens are normative and remain unchanged from the selected tech-utility direction: `bg`, `surface`, `fg`, `muted`, `border`, and `accent`. Light mode is the default. Dark mode remaps semantic roles to the `dark-*` tokens; it does not invert arbitrary colors.

- `bg` / `dark-bg`: application field.
- `surface` / `dark-surface`: editor, inspector, and raised work areas.
- `fg` / `dark-fg`: primary text and structural strokes.
- `muted` / `dark-muted`: secondary labels only; never interactive text on hover.
- `border` / `dark-border`: separators and dormant paths.
- `accent` / `dark-accent`: current route and one primary action.
- Success, warning, error, and focus colors are semantic; each requires a redundant non-color cue.

Contrast targets are 4.5:1 for normal text, 3:1 for large text and graphical controls, and 3:1 between focus indicator and adjacent colors. State changes may not reduce text contrast except when disabled.

## Typography

The utility font stack is intentionally singular for labels and prose; density and predictable metrics take priority. The mono stack is reserved for URLs, parameters, JSON, HTTP, hashes, token regions, keyboard shortcuts, and deterministic identifiers.

- `display-lg`: product identity and board title only; use `clamp(2rem, 4vw, 2.5rem)` on responsive web.
- `heading-lg` and `heading-md`: milestone and bench-region headings.
- `body-md`: prompts, concise feedback, and controls.
- `body-sm`: metadata and inline help.
- `label`: uppercase bench labels; never paragraphs.
- `code`: tabular numerals, no discretionary ligatures, visible zero, user-selectable wrap.

Never present protocol explanation as long-form reading inside the product. Put the learner in front of a state, a prompt, an editable message, or a failed check.

## Layout

Desktop uses a 12-column shell: 240px milestone rail, fluid 6–7-column bench, and 320–360px inspector. The bench may expand when the inspector is closed. Tablet uses a two-pane shell with a collapsible milestone strip and inspector drawer. Compact mobile uses one task at a time with a bottom task switcher and full-screen inspector sheet.

Spacing follows the 4px base scale in frontmatter. Default page gutter is 24px desktop, 20px tablet, and 16px compact. Dense code rows may use 8px vertical spacing; touch controls remain at least 44px. A canvas gets an explicit minimum block size and never forces page-level horizontal scrolling.

Use container queries at 1120px, 820px, and 600px. Verify 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, and 1920px widths. At 200% zoom, primary tasks reflow into one column without loss of content or function.

## Elevation & Depth

Depth comes from tonal layers, 1px rules, and inset measurement ticks. The base UI is flat. Only inspector drawers, menus, dragged objects, and urgent feedback may use shadow.

- Level 0: no shadow, hairline divider.
- Level 1: `0 1px 2px oklch(22% 0.02 240 / 0.12)` for controls over canvas.
- Level 2: `0 12px 32px oklch(22% 0.02 240 / 0.18)` for drawers and dragged actors.
- Compromised: no extra elevation; use a two-line border plus diagonal pattern so danger does not appear more clickable.

### Portable reference surfaces

Downloadable and print references are a compact projection of the same workbench language, not a separate editorial theme. They alias the normative `surface`, `fg`, `border`, `accent`, `accent-soft`, `error`, and `error-soft` roles; print pins those aliases to the light semantic mapping for dependable paper contrast. Reference hierarchy comes from rules, spacing, type weight, and semantic fills. It stays at Level 0: no decorative drop shadow, floating-card treatment, or independent paper/ink/accent palette.

One-page references preserve the document heading sequence and DOM reading order in tagged output. Body and evidence text print at 8pt or larger; provenance-only footer metadata may use 7.25pt. Generated PDFs require a title, language, structure tree, single-page assertion, logical text extraction check, and parser-backed typography guard before release.

## Shapes

### Protocol entities

| Entity | Container | Internal mark | Monochrome cue |
|---|---|---|---|
| Resource Owner | Circle | `RO` | Single ring |
| User Agent | Rounded square | top viewport notch | Double top rule |
| Client | Hexagon | `C` | clipped corners |
| Authorization Server / OP | Diamond-shield | `AS` or `OP` | central vertical seam |
| Resource Server / API | Square bracket | `API` | open left/right rails |
| Attacker proxy | Inverted triangle | `!` | diagonal hatch |

### Protocol objects and routes

- Authorization grant: ticket shape with perforated short edges.
- Authorization code: narrow ticket, one-use notch, visible TTL clock mark.
- Access token: capsule with one square end and `AT`.
- ID token: three-segment capsule labeled `H · P · S`; segment boundaries remain in monochrome.
- Refresh token: loop-tail capsule labeled `RT`.
- Front-channel message: dashed line, open arrowhead.
- Back-channel message: solid double line, filled arrowhead.
- Redirect: dash-dot hooked line.
- Local-only data: dotted enclosure.
- Trust boundary: double rule with inline label and gate marker at crossings.
- Unsafe route: diagonal crossbars over the existing line style; never red alone.

### Threat glyphs

| Threat | Glyph / pattern |
|---|---|
| CSRF / state | crossed loop |
| Code interception | split arrow + grab notch |
| Redirect manipulation | hooked arrow leaving a frame |
| Mix-up / issuer confusion | crossed diamonds |
| Token substitution | opposing swap arrows inside capsule |
| Nonce replay | loop arrow around `N` |
| Access-token leakage | broken capsule + dotted trail |
| Refresh replay | twin loop-tail capsules |
| Unsafe browser storage | open drawer + warning hatch |

## Components

### Workbench shell

Contains the milestone rail, task prompt, primary bench, status strip, and contextual inspector. The single solid action is `Run checks`; `Reset`, `Undo`, `Redo`, `Hint`, and `Inspect` are secondary or text controls.

### Actor node

Uses the entity geometry above, visible text abbreviation, full accessible name, and state label. Selected adds a 2px inner ring plus corner handles. Dragged adds Level 2 elevation. Keyboard-move mode adds a four-arrow badge and announces coordinates or lane. Locked uses a padlock glyph and `aria-disabled="true"` while retaining readable contrast.

### Message lane

Shows source, destination, direction, channel type, ordinal, and status. The selected message thickens its route and opens its exact HTTP exchange. In-flight uses a moving dash only when motion is allowed. Reduced motion swaps the source/destination markers from hollow to filled and updates the status strip.

### Parameter editor

Pairs each field with a short label, syntax role, deterministic sample, and inline check. Errors link to the field with `aria-describedby`; the summary links back to the first invalid field. Secrets are synthetic, clearly marked `LOCAL`, and copy feedback says `Synthetic value copied`.

### Token inspector

Displays header, payload, and signature regions as three distinct shapes and headings. The persistent banner reads `Decoded for inspection · Signature not verified`. Validation checks are separate rows with expected, observed, and result columns. Never use `verified`, shield-check, or trust language for decoding alone.

### Threat challenge

Pairs a named threat glyph with an unsafe configuration and a safe target state. Failure shows `COMPROMISED` plus the affected boundary and leaked/substituted/replayed object. Recovery retains the learner's edits, points to one failed invariant, and offers one staged hint.

### Terminal and schema bench

Uses editable HTTP and JSON panes, line numbers, schema diagnostics, diff view, undo/redo, copy, and deterministic reset. Tabs use roving tabindex. Diagnostics connect by line and field. Horizontal scrolling is limited to the code pane; page layout never scrolls horizontally.

### Feedback strip

`pending` uses a progress label; `success` uses check + summary; `error` uses X + failed count; `compromised` uses threat glyph + boundary name. Polite live regions report ordinary state changes. Assertive announcements are reserved for compromised results that occur after a learner action.

### Motion

- Standard: 120ms control response, 180ms inspector reveal, 280ms message traversal; ease-out for arrival, ease-in for departure.
- Reduced motion: no traversal, parallax, shaking, pulsing, or flashing. Update route weight, endpoint fill, status text, and focus placement instantly or with a 0–80ms crossfade.
- No animation may be required to understand order, source, destination, or outcome.

## Do's and Don'ts

### Do

- Use short prompts: `Connect Client to OP`, `Add code_challenge`, `Expected aud: api://notes`.
- Use immediate feedback: `Code rejected · already used`, `Safe · redirect URI exact match`.
- Say `Decode token`, `Decoded header`, and `Signature not verified`.
- Keep all examples synthetic and local: `https://op.local`, `client_notes_web`, `user_ada`, `code_demo_7K2`, `api://notes`.
- Expose the check that produced an outcome and preserve edits after failure.

### Don't

- Do not write essay headings such as `Understanding the Authorization Code Flow` followed by paragraphs.
- Do not say `This token is valid` after decoding; say `Claims checks passed · signature not verified`.
- Do not use real issuer URLs, credentials, identity data, or copied JWTs.
- Do not rely on green/red, animation, position, or icon alone.
- Do not render a generic analytics dashboard, terminal grid, or decorative network diagram.

### Copy boundary examples

| Do | Don't |
|---|---|
| `Place the OP inside the trusted zone.` | `In OAuth, the authorization server plays an important role in…` |
| `Unsafe · state missing` | `There was an error with your authorization request.` |
| `Try: bind state to this browser session.` | `Please review the documentation to learn more.` |
| `Decoded payload · 8 claims` | `Verified JWT` |
| `Issuer mismatch · expected https://op.local` | `The identity provider may be incorrect in some scenarios.` |
