# Protocol Workbench — product design contract

Status: starter contract for design authorship. Scope: responsive product UI only. Hosting target: GitHub-hosted static learning site. Data boundary: deterministic, synthetic, local-only.

## Product outcome

Learners assemble, run, inspect, break, and repair OAuth 2.0 and OpenID Connect exchanges. Progress is earned by demonstrating protocol invariants, not by completing readings. The product never performs or implies production authentication, token verification, or handling of real secrets.

Primary learning loop:

`Build → Run → Observe → Inspect → Repair → Prove`

Completion evidence records the learner action, expected invariant, observed result, and recovery—not time spent or pages viewed.

## Information architecture

1. **Workbench home** — local progress, resume action, milestone map, reset-all control.
2. **Orientation bay** — cast palette, trust-map canvas, channel legend.
3. **Flow forge** — message sequence, parameter inspector, redirect viewer, server-check rail.
4. **Scope studio** — request/grant/deny controls, consent preview, audience/resource checks.
5. **Token bench** — segmented token view, claim comparison table, decode-only boundary.
6. **Identity lab** — discovery, OIDC request, ID token consumption, UserInfo reconciliation, session board.
7. **Threat arcade** — nine threat challenges, safe/unsafe outcomes, repair loops.
8. **Terminal + schema bench** — reusable lower work surface inside milestones 1–7 and a standalone practice route.
9. **Protocol forge** — capstone assembly, injected faults, automated check panel, evidence summary.
10. **Reference drawer** — glyph legend, keyboard map, synthetic-value policy, local data controls; never a reading chapter.

Desktop navigation is a persistent milestone rail. Tablet uses a collapsible milestone strip. Compact mobile uses a `Tasks` bottom switcher and full-screen task/inspector sheets. The terminal/schema bench is contextual and never displaces the primary learning task on initial entry.

## Milestones, gates, and progression

### M0 — Orient: Cast + trust map

Modules: protocol cast and trust-map builder; terminal/schema bench introduction.

Required actions:

- Place Resource Owner, User Agent, Client, Authorization Server/OP, Resource Server/API, and attacker proxy.
- Draw at least one front channel, one back channel, and two labeled trust boundaries.
- Move an actor without drag and inspect a channel with keyboard only.

Gate: all six actors have correct roles; Client↔OP token exchange is back-channel; User Agent redirects are front-channel; attacker proxy remains outside trusted zones.

Retry: incorrect placement stays visible with the failed boundary highlighted. Hint 1 names the invariant; Hint 2 highlights candidate zones; Hint 3 demonstrates one placement then returns control.

### M1 — Compose: Authorization Code + PKCE

Modules: flow composer; redirect inspector; code lifecycle; token exchange; server checks; terminal/schema bench.

Required actions:

- Order authorization request, authentication/consent, redirect with code, and token request/response.
- Edit `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, and `code_challenge_method`.
- Exchange the one-use code with `code_verifier`; observe expiry and replay rejection.
- Identify exact redirect URI match, client binding, PKCE match, code unused, and code unexpired checks.

Gate: a complete safe trace passes every server-side check; a second use of the same code is correctly predicted as rejected.

Retry: run results preserve sequence and parameter edits. Selecting a failed check focuses the responsible message/field.

### M2 — Minimize: Scope + consent

Modules: scope and consent workshop; audience/resource indicator controls; least-privilege meter.

Required actions:

- Configure requested, granted, and denied scopes.
- Set a synthetic resource indicator and expected API audience.
- Make a consent decision, then remove a scope not needed by the task.
- Predict which operation succeeds with the resulting access token.

Gate: granted scopes are a subset of requested scopes, denied scopes are absent, audience matches `api://notes`, and the least-privilege task still succeeds.

Retry: show the unnecessary permission by name and the affected operation; never reduce the issue to a score alone.

### M3 — Inspect: Tokens + claims

Modules: token/claim workbench; validation table; token comparison.

Required actions:

- Decode synthetic access and ID tokens into header, payload, and signature regions.
- Compare expected and observed `iss`, `aud`, `nonce`, `exp`, `azp`, and `at_hash` where applicable.
- Distinguish access token audience/purpose from ID token audience/purpose.
- State through the interaction that decoding is not cryptographic verification.

Gate: all applicable claim checks are classified correctly and the learner selects `Signature not verified` before accepting the inspection result.

Retry: failed claim row shows expected, observed, rule, and source token. `Fix sample` changes only the selected synthetic claim.

### M4 — Identify: OIDC identity lab

Modules: discovery metadata; authorization request; ID token consumption; UserInfo reconciliation; subject/session board.

Required actions:

- Select endpoints from `https://op.local/.well-known/openid-configuration`.
- Add `openid`, `state`, and `nonce`; reconcile the returned nonce.
- Consume the synthetic ID token using issuer/audience/expiry/nonce checks plus a separate signature-verification placeholder explicitly marked `Not performed in this learning UI`.
- Reconcile UserInfo `sub` with ID token `sub`; compare pairwise/public subject examples; inspect local session start/end.

Gate: discovery endpoints, request, claim checks, subject reconciliation, and session events form one consistent local trace.

Retry: mismatch remains attached to its origin—metadata, request, ID token, UserInfo, or session—not a generic error banner.

### M5 — Defend: Threat arcade

Modules: nine threat challenges plus terminal/schema bench.

Threat set and safe invariant:

1. CSRF/state — state is unpredictable, session-bound, and matched once.
2. Code interception/PKCE — S256 challenge binds the intercepted code to the verifier.
3. Redirect URI manipulation — exact pre-registered match; no open redirect.
4. Mix-up/issuer confusion — response is bound to the expected issuer/authorization server.
5. Token substitution/audience confusion — token type and audience match the consuming component.
6. Nonce replay — nonce is request-bound, matched, and consumed once.
7. Access-token leakage — token avoids URL/log/storage exposure and is sent only to the intended API.
8. Refresh-token replay/rotation — rotation detects reuse and invalidates the token family.
9. Unsafe browser storage — durable script-readable storage is rejected for bearer tokens.

Gate: repair at least one injected instance of every threat and correctly predict both the unsafe consequence and safe outcome.

Retry: the compromised trace persists; recovery points to one violated invariant. Threat glyph, striped boundary, object label, and text result remain visible together.

### M6 — Operate: Terminal + schema bench

Modules: HTTP editor; JSON editor; schema diagnostics; diff; deterministic reset; undo/redo; copy.

Required actions:

- Edit request line, headers, form body, JSON body, and a claim value.
- Resolve a syntax error and a schema error.
- Compare current vs reset state, undo and redo an edit, then copy a synthetic exchange.

Gate: final exchange parses, matches the local schema, and produces the expected deterministic response.

Retry: syntax and schema issues remain distinct; reset offers confirmation only when it would discard edits and always restores the same fixture.

### M7 — Forge: Secure capstone

Modules: capstone protocol forge; fault injector; automated security checks; evidence summary.

Required actions:

- Assemble a complete OIDC Authorization Code + PKCE trace.
- Configure discovery-derived endpoints, exact redirect URI, state, nonce, S256 PKCE, scopes, resource/audience, code redemption, token/claim checks, UserInfo subject reconciliation, and secure local session handling.
- Repair injected faults drawn from at least five threat families.
- Run all checks and inspect the evidence for every pass.

Gate: zero unresolved critical checks; all required invariants pass; decoding remains labeled inspection-only; evidence summary contains action, invariant, observed result, and trace reference.

Retry: reruns are unlimited. New fault sets are deterministic by visible seed. The learner can retry one check, one phase, or the full trace without losing unrelated correct work.

## Progression rules

- M0 is required. M1–M4 unlock sequentially because each reuses the prior trace.
- M5 unlocks after M3; individual threats unlock when their prerequisite concept passes.
- M6 tools appear contextually from M0 onward; its standalone gate is required before M7.
- M7 requires M0–M6 gates. Completion never depends on hint count, time, pointer input, audio, motion, or color perception.
- A gate records `not started`, `in progress`, `ready to check`, `passed`, or `needs repair` locally.
- Learners may revisit passed work. Editing a gate-relevant invariant marks only that gate `ready to recheck`; it does not erase evidence from unrelated milestones.
- `Reset task` resets the current fixture. `Reset milestone` requires confirmation. `Reset all local progress` requires typed confirmation and states that recovery is unavailable.
- Offline use keeps all completed fixtures and interactions available after the site shell has loaded. No login, analytics requirement, remote API, real issuer, or network dependency is implied.

## Canonical interaction states

Every module implements these named states. State changes must update visible text, programmatic state, and the module-specific non-color cue.

1. `empty` — no learner-created content; one short starting prompt and available palette/action.
2. `ready` — deterministic fixture loaded; run/check action available.
3. `focused-selected` — keyboard focus and selection are visually distinct; inspector target identified.
4. `editing-dragging` — provisional change visible; commit/cancel instructions exposed; canvas item uses move mode when keyboard operated.
5. `pending-in-flight` — affected message/check named; duplicate run disabled; cancellation offered only when safe.
6. `success` — passed invariant, evidence link, check glyph, and concise result.
7. `error` — failed input or invariant, linked field/message, error glyph, recovery action.
8. `disabled-locked` — reason visible or discoverable; disabled state not focusable unless it opens an explanation.
9. `hint-recovery` — one staged hint, target invariant, resume action, edits preserved.
10. `threat-compromised` — unsafe consequence, affected object/boundary, threat glyph/pattern, assertive announcement after initiated run.

## Exact module state contract

### 1. Cast + trust-map builder

- Empty: actor dock full; canvas says `Place six actors`; no boundaries.
- Ready: starter zones visible; actors remain in dock; `Check map` enabled after first placement.
- Focused/selected: node gains inner ring; status names actor, zone, and connections.
- Editing/dragging: origin slot remains as a ghost; valid zones use corner ticks; keyboard move announces lane/position.
- Pending/in-flight: channel check traces endpoints in order; edits temporarily paused.
- Success: six role checks and channel/boundary checks listed as evidence.
- Error: misplaced actor or channel endpoint gets numbered marker linked to feedback.
- Disabled/locked: unavailable actor duplicate shows lock and `Already placed`.
- Hint/recovery: highlights one zone or connection candidate without moving it.
- Threat/compromised: attacker crossing a boundary adds hatch, `Boundary crossed`, and the exposed message name.

### 2. Authorization Code + PKCE composer

- Empty: unordered message tray; parameter inspector closed.
- Ready: deterministic actors and empty sequence lanes loaded.
- Focused/selected: message ordinal, endpoints, and channel type announced.
- Editing/dragging: insertion line and target ordinal shown; keyboard reorder uses `Ctrl/⌘ + Arrow`.
- Pending/in-flight: current message endpoint markers fill; current server check named.
- Success: complete trace and every server-side check show pass evidence.
- Error: first invalid message/parameter is linked; remaining checks show `Not run`.
- Disabled/locked: token exchange unavailable until a redirect code exists.
- Hint/recovery: names missing invariant, then optional candidate message/field.
- Threat/compromised: intercepted/replayed code shows one-use notch broken and unsafe consequence.

### 3. Scope + consent workshop

- Empty: task requirement visible; requested/granted/denied sets empty.
- Ready: candidate scopes and synthetic API operations available.
- Focused/selected: scope name, operation, sensitivity, and current set announced.
- Editing/dragging: target set labeled; checkbox/move controls mirror drag.
- Pending/in-flight: consent decision and resource/audience checks named.
- Success: least-privilege set supports the task; extra permissions count is zero.
- Error: missing or excessive scope linked to affected operation.
- Disabled/locked: grant is unavailable until requested; reason appears beside control.
- Hint/recovery: identifies one unnecessary or missing permission.
- Threat/compromised: overbroad grant adds striped scope tile and affected data label.

### 4. Token/claim workbench

- Empty: token input contains only `Paste a synthetic local token`; decode disabled.
- Ready: fixture token marked `SYNTHETIC · LOCAL`; `Decode for inspection` enabled.
- Focused/selected: H/P/S region and character range announced; claim row identifies source region.
- Editing/dragging: synthetic claim editor shows uncommitted diff; signature region marked unchanged/not verified.
- Pending/in-flight: decode/check step named; no verification language or shield-check icon.
- Success: applicable claim checks pass; banner still reads `Signature not verified`.
- Error: malformed encoding or claim mismatch links to exact region/claim.
- Disabled/locked: claim checks unavailable until decoding completes; reason visible.
- Hint/recovery: shows expected claim rule and one synthetic correction.
- Threat/compromised: substituted/replayed token uses broken capsule pattern and consuming component.

### 5. OIDC identity lab

- Empty: metadata endpoint and identity trace slots empty.
- Ready: local discovery fixture available; `Load local metadata` enabled.
- Focused/selected: endpoint, request field, claim, UserInfo field, or session event named.
- Editing/dragging: request/session edits show origin and destination; reorder alternatives provided.
- Pending/in-flight: current local exchange and expected endpoint named.
- Success: discovery, request, ID token checks, subject reconciliation, and session trace agree.
- Error: mismatch stays attached to metadata/request/token/UserInfo/session origin.
- Disabled/locked: UserInfo unavailable until an access token with correct audience/scope exists.
- Hint/recovery: names the mismatching origin pair without replacing values.
- Threat/compromised: issuer, nonce, or subject confusion marks crossed diamonds/loop and unsafe identity binding.

### 6. Threat arcade

- Empty: challenge board shows nine named threat glyphs; no challenge selected.
- Ready: selected deterministic unsafe fixture loads with `Predict outcome`.
- Focused/selected: glyph, threat name, affected boundary/object, and challenge status announced.
- Editing/dragging: repair controls expose original vs current values; non-pointer controls complete every repair.
- Pending/in-flight: attack trace step and affected asset named.
- Success: `SAFE` plus enforced invariant and blocked consequence.
- Error: incorrect repair shows remaining violated invariant, not the full answer.
- Disabled/locked: prerequisite challenge identifies the milestone gate needed.
- Hint/recovery: three-stage invariant → location → worked micro-step sequence.
- Threat/compromised: `COMPROMISED`, threat glyph, striped route/boundary, affected object, and concrete consequence.

### 7. Terminal + schema bench

- Empty: deterministic example menu; editors blank; run disabled.
- Ready: selected fixture loaded; reset baseline recorded locally.
- Focused/selected: pane, line, column, and diagnostic count announced on request.
- Editing/dragging: dirty marker, diff availability, undo/redo state, and validation delay visible.
- Pending/in-flight: local parse/schema/response phase named; edit remains available unless result would race.
- Success: parse, schema, and expected-response rows pass with copied trace reference.
- Error: syntax and schema errors use distinct labels and link to line/field.
- Disabled/locked: copy/run/redo states expose reasons in accessible descriptions.
- Hint/recovery: diagnostic offers format hint, expected type, or diff to reset.
- Threat/compromised: unsafe header/body/storage choice marks exact lines and exposure path.

### 8. Capstone protocol forge

- Empty: assembly inventory and required invariants visible; trace lanes empty.
- Ready: visible deterministic fault seed loaded; build/check controls available.
- Focused/selected: phase, object, current check count, and inspector target announced.
- Editing/dragging: cross-phase changes show dependent checks that will require rerun.
- Pending/in-flight: active phase/check and overall progress shown; duplicate run disabled.
- Success: zero critical failures and evidence summary grouped by phase/invariant.
- Error: failures ranked critical then required then advisory; first failure receives focus only after summary announcement.
- Disabled/locked: final completion unavailable until every required gate passes; missing gates linked.
- Hint/recovery: retry one check, phase, or full trace; unrelated correct work retained.
- Threat/compromised: injected fault displays its established threat glyph, affected object/boundary, unsafe consequence, and evidence gap.

## Assessment and retry loop

- Checks evaluate observable configuration and sequence, not a hidden preferred gesture.
- Each result row contains: check name, expected invariant, observed value/event, result, trace link, retry action.
- First failure gives direct local feedback. Repeated failure offers Hint 1 automatically but never opens it without learner action. Hint use has no score penalty.
- Success requires learner-triggered execution. Auto-validation may prepare results but does not silently pass a gate.
- Partial success persists. Correct items remain marked unless a dependent edit invalidates them.
- Completion summary is evidence-based: milestone, invariant, learner action, observed result, trace ID, hints used (private/local), and timestamp relative to local session only.
- No leaderboard, streak pressure, opaque score, or remote credential is part of the starter system.

## Keyboard and non-pointer model

Global reading order: product header → milestone rail/current task switcher → prompt → bench toolbar → primary bench → status strip → inspector → terminal/schema bench. DOM order follows this sequence even when desktop layout places the inspector to the right.

- `Tab` / `Shift+Tab`: move among regions and controls, never through every canvas object by default.
- Canvas uses roving tabindex: one actor/message is in the tab order; arrow keys move focus spatially; `Home/End` select first/last; `Ctrl/⌘+Home/End` selects first/last lane.
- `Enter`: select/open inspector; on a connector port, begin or complete a connection.
- `Space`: pick up/drop actor or message; arrow keys move by lane/grid; `Shift+Arrow` moves a larger step; announcements name target and validity.
- `C`: start connection mode from selected node; arrows choose a compatible endpoint; `Enter` commits; `Escape` cancels.
- `Ctrl/⌘+Arrow`: reorder selected messages without drag.
- `I`: open inspector for the selected object. `Escape` closes inspector and restores focus to its invoker.
- `Ctrl/⌘+Enter`: run the current check. `Ctrl/⌘+Shift+Enter`: run all available checks.
- `Ctrl/⌘+Z` and `Ctrl/⌘+Shift+Z` (plus `Ctrl+Y`): undo/redo scoped to current fixture.
- `R` is not a reset shortcut. Reset always uses a named control and confirmation when edits would be lost.
- `Escape` priority: cancel connection/move → close menu → close inspector/sheet → return focus to current bench. It never clears work.
- Visible keyboard map is reachable from every module; shortcuts never replace labeled controls.

Pointer drag always has a select + `Move to…` or reorder-button equivalent. Connections always have `Connect from` / `Connect to` selects. Hover-only content is prohibited. Minimum target is 44×44 CSS px; coarse-pointer layouts use 48×48 CSS px.

## Responsive behavior

### Desktop ≥1120px

- Persistent 240px milestone rail, fluid bench, 320–360px inspector.
- Canvas and trace may share the center with a bottom terminal bench.
- Hover previews supplement, never replace, focus and selection.
- Keyboard focus is never obscured by sticky header or status strip.

### Tablet 600–1119px

- Milestones collapse to a horizontal progress strip with a labeled menu.
- Bench and inspector form two panes at ≥820px; below 820px inspector becomes an anchored drawer.
- Threat arcade becomes a two-column glyph list; terminal/schema bench uses stacked editors with persistent tabs.
- Drag uses enlarged handles; connections use explicit start/end controls.

### Compact mobile 360–599px

- One task surface at a time: `Build`, `Inspect`, `Trace`, `Checks` bottom switcher.
- Canvas becomes lane-based placement with `Move to lane` controls; free spatial placement is optional and never required.
- Message composer becomes an ordered list with move-up/down actions.
- Token regions stack H, P, S; claim rows become labeled key/value/result groups.
- Code wraps off by default inside its own scroll region; `Wrap lines` is adjacent. The page never scrolls horizontally.
- Inspector is a full-screen sheet with visible close and focus restoration.
- Sticky run bar contains at most one primary action and respects safe-area insets.

## Accessibility contract

- Use native controls and landmark elements. Custom canvas objects use composite widget semantics with an accessible instruction and current item count.
- Names include entity/object plus current role: `Client, selected, trusted app zone`; avoid shape-only names.
- Expose selected, expanded, pressed, invalid, disabled, grabbed/move-mode, current milestone, and check status through native/ARIA state as applicable.
- One polite live region reports selection, move, validation, pending, and success. One assertive region is reserved for action-triggered compromised outcomes and blocking errors. Never announce every animation frame.
- Restore focus to the invoking object after inspector, dialog, hint, or full-screen sheet closes. After run, keep focus on Run and announce summary; move focus only when the learner chooses a result link.
- Error summaries link to fields/messages. Each control uses `aria-describedby` for its own concise error. Do not duplicate the same message in multiple live regions.
- All actors, message types, boundaries, tokens, outcomes, and threats combine text with geometry, line style, pattern, or glyph. The monochrome view must retain the same distinctions.
- Maintain WCAG AA: 4.5:1 normal text, 3:1 large text/icons/control boundaries, visible 3px focus ring, and no reduced-contrast hover state.
- Support 200% browser zoom without two-dimensional page scrolling and 400% text zoom/reflow for a 1280px viewport equivalent. No clipping, hidden task actions, or fixed-height text containers.
- Code/token text is at least 14px/1.55, selectable, preserves punctuation, offers wrapping, distinguishes ambiguous zero, and never encodes validity with syntax color alone.
- Reduced motion preserves order and state through endpoint fill, route weight, ordinal, status text, and focus. No parallax, shake, message flight, rapid flash, or essential timed animation.
- Offline/local-only status is persistent in the header and data controls. Copy announcements identify values as synthetic.

## No-essay content boundary

For the default first-run orientation, this boundary is superseded by
`GUIDED_LEARNING_PASS.md`: concise conceptual explanation is required before practice. The
limits below continue to apply inside the eight hands-on milestone benches.

Allowed: task prompts under 120 characters; labels; endpoint/parameter/claim names; synthetic code and HTTP; one-line outcome; one-line security consequence; staged hints; concise keyboard/screen-reader instructions; evidence rows.

Disallowed: conceptual chapters, multi-paragraph explanations, historical background, standards summaries, marketing promises, generic encouragement, and any copy that calls decode output verified.

Copy test: if content can be replaced by an action, editable example, state comparison, or result row, use that interaction. If a concept needs more than three short lines, split it across prompt → action → feedback.

## Acceptance criteria by milestone

### M0 acceptance

- [ ] All six actors can be placed, selected, moved, inspected, and reset with pointer and keyboard.
- [ ] Front/back channels and trust boundaries have distinct monochrome line/shape treatments.
- [ ] Gate detects role, endpoint, channel, boundary, and attacker-zone errors independently.
- [ ] Focus and live-region output name actor, zone, and connection state.

### M1 acceptance

- [ ] Learner can compose and reorder the full Authorization Code + PKCE sequence without drag.
- [ ] All required request/token parameters are editable and linked to server checks.
- [ ] Code TTL, single use, exact redirect URI, client binding, and S256 verifier checks are observable.
- [ ] Replay produces a named rejection and recoverable trace.

### M2 acceptance

- [ ] Requested, granted, and denied scope sets are independently represented and operable.
- [ ] Resource indicator and audience checks affect the synthetic API outcome.
- [ ] Least-privilege feedback names unnecessary/missing permission and affected operation.
- [ ] Safe completion is possible without granting every available scope.

### M3 acceptance

- [ ] Access and ID token fixtures are synthetic/local and visually segmented H/P/S where applicable.
- [ ] Every decode view persistently states `Signature not verified`.
- [ ] Applicable issuer, audience, nonce, expiry, azp, and at_hash rows show expected, observed, and result.
- [ ] Token purpose/audience substitution is detected with text plus broken-capsule/swap cue.

### M4 acceptance

- [ ] Local discovery metadata drives visible endpoint selection.
- [ ] `openid`, state, nonce, ID token consumption, UserInfo subject reconciliation, subject types, and session events are interactive.
- [ ] Metadata/request/token/UserInfo/session errors remain linked to their origin.
- [ ] Signature verification is represented only as an explicit unperformed boundary, never simulated.

### M5 acceptance

- [ ] All nine named threats have unique monochrome glyph/pattern cues.
- [ ] Each threat includes deterministic unsafe fixture, concrete compromised outcome, repair, and safe result.
- [ ] Threats are completable without pointer, color, or motion.
- [ ] Compromised announcements name threat, affected object/boundary, and consequence once.

### M6 acceptance

- [ ] HTTP and JSON are editable with distinct syntax/schema diagnostics and linked locations.
- [ ] Undo, redo, copy, diff, and deterministic reset work with visible state and keyboard controls.
- [ ] Copy feedback says the value/exchange is synthetic.
- [ ] Code panes can scroll or wrap without causing page-level horizontal overflow.

### M7 acceptance

- [ ] Learner can assemble a complete secure OIDC Authorization Code + PKCE trace.
- [ ] Fault seed is visible and deterministic; at least five threat families can be injected and repaired.
- [ ] Automated checks expose expected invariant, observation, result, and trace link.
- [ ] Completion requires zero critical/required failures and never claims cryptographic verification.

## Cross-cutting acceptance criteria

### State and recovery

- [ ] Every module exposes all ten canonical states with module-specific copy and non-color cues.
- [ ] Errors preserve edits; partial success persists; retry can target a check, phase, or fixture.
- [ ] Reset scope and data loss are explicit; full local reset requires typed confirmation.
- [ ] Offline-loaded fixtures, gates, evidence, undo/redo, and reset work without remote services.

### Responsive and input

- [ ] No horizontal page scroll at 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, or 1920px.
- [ ] Compact mobile replaces free canvas/reorder drag with lanes and ordered-list controls.
- [ ] Targets are ≥44px and ≥48px for coarse pointers.
- [ ] All pointer actions have visible keyboard/non-pointer alternatives.

### Keyboard and focus

- [ ] Reading/DOM order matches the documented sequence.
- [ ] Canvas roving tabindex, spatial focus, move mode, connection mode, reorder, inspector, run, undo/redo, and Escape priority match the keyboard contract.
- [ ] Focus is never lost, obscured, or moved unexpectedly after checks and closing layers.
- [ ] Shortcut reference is visible and all commands have labeled controls.

### Perception and content

- [ ] Light/dark themes meet stated contrast targets in default, hover, focus, active, selected, disabled, error, success, and compromised states.
- [ ] Monochrome review preserves every actor, object, channel, boundary, outcome, and threat distinction.
- [ ] Reduced-motion review preserves sequence and status without flight, parallax, shake, pulse, or flash.
- [ ] Practice benches contain no essay copy; the first-run guide follows `GUIDED_LEARNING_PASS.md`; no product UI contains external assets, real identifiers, or verification claims based on decode.

### Design-only boundary

- [ ] Deliverables define UI, behavior, state, content, and acceptance only.
- [ ] No app implementation, package setup, tests, deployment, workflows, publishing, login, or network integration is included.
- [ ] All visible protocol examples use `*.local`, `api://notes`, and clearly synthetic identifiers.

## Synthetic fixture namespace

- Issuer: `https://op.local`
- Authorization endpoint: `https://op.local/authorize`
- Token endpoint: `https://op.local/token`
- UserInfo endpoint: `https://op.local/userinfo`
- Client: `client_notes_web`
- Redirect URI: `https://client.local/callback`
- Resource: `api://notes`
- Resource owner: `user_ada`
- Authorization code: `code_demo_7K2`
- Access token label: `at_demo_A17`
- ID token label: `id_demo_I42`
- Refresh token label: `rt_demo_R09`
- Trace IDs: `trace_local_001` onward

Every fixture is labeled `SYNTHETIC · LOCAL`. Values are intentionally non-production and must not be accepted from or sent to a remote endpoint.

## design.md lint outcome

- Command: `npx -y @google/design.md lint DESIGN.md`.
- Final result: exit code `0`; `0` errors, `0` warnings, `1` informational token summary.
- Corrections made after the first successful parse: replaced unsupported component sub-token names with alpha-spec-supported names, removed non-token border/elevation/motion metadata from the token block while retaining those rules in contract prose, referenced semantic theme tokens through valid components, darkened the primary accent and warning text roles, and rechecked every reported contrast warning.
- Environment note: the first invocation could not access the user npm cache because it contains root-owned entries. The same linter was rerun with `NPM_CONFIG_CACHE=/tmp/havesome-oidc-npm-cache`; no global ownership or repository configuration was changed.
