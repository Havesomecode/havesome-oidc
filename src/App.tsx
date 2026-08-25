import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CAPSTONE_SCENARIOS,
  DISCOVERY_FIXTURE,
  THREATS,
  type CheckResult,
  checkCapstone,
  checkPkceFlow,
  checkScopeSelection,
  decodeSyntheticJwt,
  encodeSyntheticJwt,
  validateDiscovery,
} from './protocol';
import { CheatSheet } from './CheatSheet';
import './styles.css';

type MilestoneId = `M${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
type GateStatus = 'not started' | 'in progress' | 'ready to check' | 'passed' | 'needs repair';
type Progress = Partial<Record<MilestoneId, GateStatus>>;

type Milestone = {
  id: MilestoneId;
  verb: string;
  title: string;
  prompt: string;
  trace: string;
};

const MILESTONES: Milestone[] = [
  {
    id: 'M0',
    verb: 'Orient',
    title: 'Cast + trust map',
    prompt: 'Place six actors. Keep the attacker outside trusted zones.',
    trace: 'trace_local_001',
  },
  {
    id: 'M1',
    verb: 'Compose',
    title: 'Authorization Code + PKCE',
    prompt: 'Build the front channel, then redeem one code with S256.',
    trace: 'trace_local_006',
  },
  {
    id: 'M2',
    verb: 'Minimize',
    title: 'Scope + consent',
    prompt: 'Grant only what reading one note needs.',
    trace: 'trace_local_008',
  },
  {
    id: 'M3',
    verb: 'Inspect',
    title: 'Tokens + claims',
    prompt: 'Decode the fixture. Classify claims without trusting the signature.',
    trace: 'trace_local_014',
  },
  {
    id: 'M4',
    verb: 'Identify',
    title: 'OIDC identity lab',
    prompt: 'Build one issuer-bound identity trace from metadata to session.',
    trace: 'trace_local_020',
  },
  {
    id: 'M5',
    verb: 'Defend',
    title: 'Threat arcade',
    prompt: 'Repair nine deterministic protocol attacks.',
    trace: 'trace_local_030',
  },
  {
    id: 'M6',
    verb: 'Operate',
    title: 'Terminal + schema bench',
    prompt: 'Repair the exchange. Compare, undo, copy, and reset locally.',
    trace: 'trace_local_050',
  },
  {
    id: 'M7',
    verb: 'Forge',
    title: 'Secure capstone',
    prompt: 'Repair five faults, then produce a complete evidence trace.',
    trace: 'trace_local_100',
  },
];

const ACTORS = [
  { id: 'owner', mark: 'RO', name: 'Resource Owner', expected: 'Browser session' },
  { id: 'agent', mark: 'UA', name: 'User Agent', expected: 'Browser session' },
  { id: 'client', mark: 'C', name: 'Client', expected: 'Trusted application' },
  { id: 'op', mark: 'OP', name: 'Authorization Server / OP', expected: 'Issuer boundary' },
  { id: 'api', mark: 'API', name: 'Resource Server / API', expected: 'Resource boundary' },
  { id: 'attacker', mark: '!', name: 'Attacker proxy', expected: 'Untrusted network' },
];

const SEQUENCE = [
  {
    id: 'authorize',
    type: 'GET /authorize',
    route: 'Client → User Agent → OP',
    channel: 'front · redirect',
    object: 'state + S256 challenge',
  },
  {
    id: 'consent',
    type: 'Authenticate + consent',
    route: 'Resource Owner ↔ OP',
    channel: 'front · local fixture',
    object: 'consent decision',
  },
  {
    id: 'callback',
    type: '302 /callback?code=…',
    route: 'OP → User Agent → Client',
    channel: 'front · redirect',
    object: 'code_demo_7K2 + state',
  },
  {
    id: 'token-request',
    type: 'POST /token',
    route: 'Client ⇄ OP',
    channel: 'back · TLS',
    object: 'code + verifier',
  },
  {
    id: 'token-response',
    type: '200 token response',
    route: 'OP ⇄ Client',
    channel: 'back · TLS',
    object: 'at_demo_A17 + id_demo_I42',
  },
];

const INITIAL_HTTP = `POST /token HTTP/1.1
Host: op.local
Content-Type: application/x-www-form-urlencoded

client_id=client_notes_web&code=code_demo_7K2&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&grant_type=authorization_code`;

const INITIAL_JSON = `{
  "issuer": "https://op.local",
  "audience": "api://notes",
  "subject": "user_ada"
}`;

const SYNTHETIC_ID_TOKEN = encodeSyntheticJwt({
  iss: 'https://op.local',
  aud: 'client_notes_web',
  sub: 'user_ada',
  nonce: 'nonce_local_N42',
  exp: 4102444800,
  azp: 'client_notes_web',
  at_hash: 'hash_demo_A17',
  token_use: 'id',
});

type ScenarioId = 'server' | 'spa' | 'native' | 'oauth';

type GuideScenario = {
  id: ScenarioId;
  label: string;
  useWhen: string;
  actors: string[];
  redirect: string;
  tokenResult: string;
  steps: Array<{ title: string; route: string; detail: string }>;
};

const GUIDE_SCENARIOS: GuideScenario[] = [
  {
    id: 'server',
    label: 'Server web app',
    useWhen: 'Use this when your server can keep a session and handle the code exchange.',
    actors: ['Person', 'Browser', 'Web server', 'OpenID Provider', 'Notes API'],
    redirect: 'https://client.local/callback',
    tokenResult: 'ID token → server session · access token → API',
    steps: [
      {
        title: 'Create the transaction',
        route: 'Web server → Browser',
        detail: 'The client stores state and nonce, then creates a PKCE S256 challenge.',
      },
      {
        title: 'Send the authorization request',
        route: 'Browser → OpenID Provider',
        detail: 'The browser carries redirect_uri, scope, state, nonce, and the PKCE challenge.',
      },
      {
        title: 'Authenticate and approve',
        route: 'Person ↔ OpenID Provider',
        detail: 'The provider authenticates the person and asks for consent when needed.',
      },
      {
        title: 'Return one code',
        route: 'OpenID Provider → Browser → callback',
        detail: 'The client accepts the callback only when its stored state matches.',
      },
      {
        title: 'Redeem and validate',
        route: 'Web server ↔ token endpoint',
        detail: 'The server sends the one-time code and verifier, then validates the ID token.',
      },
    ],
  },
  {
    id: 'spa',
    label: 'Browser SPA',
    useWhen: 'Use this for browser JavaScript with no confidential client secret.',
    actors: ['Person', 'Browser SPA', 'OpenID Provider', 'Notes API'],
    redirect: 'https://spa.local/auth/callback',
    tokenResult: 'ID token → SPA session · access token → API',
    steps: [
      {
        title: 'Start in the browser',
        route: 'SPA → Browser storage',
        detail: 'The SPA creates state, nonce, and a fresh PKCE verifier without a client secret.',
      },
      {
        title: 'Navigate to authorization',
        route: 'Browser → OpenID Provider',
        detail: 'A full-page redirect crosses the browser boundary; PKCE S256 protects the code.',
      },
      {
        title: 'Authenticate and approve',
        route: 'Person ↔ OpenID Provider',
        detail: 'The provider, not the SPA, collects the person’s credentials.',
      },
      {
        title: 'Return to the SPA route',
        route: 'OpenID Provider → Browser SPA',
        detail: 'The SPA checks state before treating the response as its transaction.',
      },
      {
        title: 'Redeem with PKCE',
        route: 'Browser SPA ↔ token endpoint',
        detail: 'The token endpoint verifies the code and verifier; CORS must allow the origin.',
      },
    ],
  },
  {
    id: 'native',
    label: 'Native app',
    useWhen: 'Use the system user agent so the native app never collects provider credentials.',
    actors: ['Person', 'Native app', 'External browser', 'OpenID Provider', 'Mobile API'],
    redirect: 'https://app.example.com/oauth/callback',
    tokenResult: 'ID token → app session · access token → API',
    steps: [
      {
        title: 'Open the system browser',
        route: 'Native app → system user agent',
        detail: 'The app creates state, nonce, and PKCE S256 before leaving the app boundary.',
      },
      {
        title: 'Authorize at the provider',
        route: 'External browser → OpenID Provider',
        detail: 'The person signs in through the trusted provider surface.',
      },
      {
        title: 'Return through the OS',
        route: 'Browser → claimed HTTPS app link',
        detail:
          'The operating system hands the verified HTTPS callback to the app. Private-use schemes and loopback redirects are alternatives.',
      },
      {
        title: 'Match the transaction',
        route: 'Native app state store',
        detail: 'The app rejects a missing or changed state before redeeming the code.',
      },
      {
        title: 'Redeem with the verifier',
        route: 'Native app ↔ token endpoint',
        detail: 'The one-time code is bound to the original S256 verifier.',
      },
    ],
  },
  {
    id: 'oauth',
    label: 'OAuth-only API access',
    useWhen: 'Use this when the client needs delegated API access, not a sign-in identity.',
    actors: ['Person', 'Client', 'Authorization Server', 'Resource API'],
    redirect: 'https://client.local/oauth/callback',
    tokenResult: 'Access token → API · no ID token',
    steps: [
      {
        title: 'Ask for API access',
        route: 'Client → Browser',
        detail: 'The client requests the smallest useful API scopes with state and PKCE S256.',
      },
      {
        title: 'Authorize access',
        route: 'Browser → Authorization Server',
        detail: 'The authorization server handles the resource owner’s decision.',
      },
      {
        title: 'Return a code',
        route: 'Authorization Server → callback',
        detail: 'The client matches state and sends the code only to the token endpoint.',
      },
      {
        title: 'Redeem once',
        route: 'Client ↔ token endpoint',
        detail: 'The server checks redirect_uri, code lifetime, one-time use, and PKCE.',
      },
      {
        title: 'Call the API',
        route: 'Client → Resource API',
        detail: 'The access token authorizes the API call. It does not prove a login identity.',
      },
    ],
  },
];

type RedirectCaseId =
  | 'exact'
  | 'scheme'
  | 'host'
  | 'port'
  | 'path'
  | 'query'
  | 'encoding'
  | 'state'
  | 'grant'
  | 'claims'
  | 'browser';

const REDIRECT_CASES: Array<{
  id: RedirectCaseId;
  label: string;
  diagnosis: string;
}> = [
  {
    id: 'exact',
    label: 'Exact match',
    diagnosis:
      'Exact redirect match. The authorization server may redirect; next inspect the returned state before code redemption.',
  },
  {
    id: 'scheme',
    label: 'Scheme mismatch',
    diagnosis:
      'redirect_uri_mismatch: the scheme differs from the registered value. Do not redirect. Inspect HTTP versus HTTPS and the exact client registration.',
  },
  {
    id: 'host',
    label: 'Host mismatch',
    diagnosis:
      'redirect_uri_mismatch: the host differs from the registered value. Do not redirect. Inspect subdomains, tenant hosts, and the exact client registration.',
  },
  {
    id: 'port',
    label: 'Port mismatch',
    diagnosis:
      'redirect_uri_mismatch: the port differs from the registered value. Do not redirect. Inspect explicit and default ports; native loopback ports are the narrow exception.',
  },
  {
    id: 'path',
    label: 'Path mismatch',
    diagnosis:
      'redirect_uri_mismatch: the path differs from the registered value. Do not redirect. Inspect the client registration and authorization request.',
  },
  {
    id: 'query',
    label: 'Query mismatch',
    diagnosis:
      'redirect_uri_mismatch: the query differs from the registered value. Do not redirect. Inspect fixed query parameters and their exact ordering and encoding.',
  },
  {
    id: 'encoding',
    label: 'Encoding mismatch',
    diagnosis:
      'redirect_uri_mismatch: the encoding differs from the registered value. Do not redirect. Compare the exact serialized URI rather than a decoded look-alike.',
  },
  {
    id: 'state',
    label: 'State loss',
    diagnosis:
      'State/transaction loss: the callback has no matching state. Stop before redemption and inspect cookies, storage, and the original transaction record.',
  },
  {
    id: 'grant',
    label: 'invalid_grant',
    diagnosis:
      'invalid_grant at the token endpoint: the code may be used, expired, issued to another client, or paired with the wrong verifier. Inspect the redemption trace.',
  },
  {
    id: 'claims',
    label: 'Issuer / audience',
    diagnosis:
      'Issuer/audience mismatch after redemption: reject the ID token and inspect discovery issuer, iss, aud, and client_id together.',
  },
  {
    id: 'browser',
    label: 'Browser boundary',
    diagnosis:
      'Browser boundary failure: redirects, CORS, and cookies are different mechanisms. Inspect the failing network entry, allowed origin, SameSite, and cookie domain.',
  },
];

const TROUBLESHOOT_CASE_IDS: RedirectCaseId[] = ['path', 'state', 'grant', 'claims', 'browser'];

function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      return JSON.parse(localStorage.getItem('protocol-workbench-progress') ?? '{}') as Progress;
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem('protocol-workbench-progress', JSON.stringify(progress));
  }, [progress]);
  const mark = (id: MilestoneId, status: GateStatus) =>
    setProgress((current) => ({ ...current, [id]: status }));
  return { progress, setProgress, mark };
}

function ResultTable({
  checks,
  title = 'Evidence checks',
}: {
  checks: CheckResult[];
  title?: string;
}) {
  if (!checks.length) return null;
  return (
    <section className="evidence" aria-label={title}>
      <div className="section-heading">
        <span className="eyebrow">{title}</span>
        <span className="count">
          {checks.filter((check) => check.passed).length}/{checks.length} pass
        </span>
      </div>
      <div className="result-list">
        {checks.map((check) => (
          <article
            className={`result ${check.passed ? 'pass' : 'fail'}`}
            key={check.id}
            id={`check-${check.id}`}
          >
            <span className="result-mark" aria-hidden="true">
              {check.passed ? '✓' : '×'}
            </span>
            <div>
              <strong>{check.label}</strong>
              <span>Expected: {check.expected}</span>
              <span>Observed: {check.observed}</span>
            </div>
            <a href={`#${check.trace}`}>{check.trace}</a>
          </article>
        ))}
      </div>
    </section>
  );
}

function RunButton({
  onClick,
  children = 'Run checks',
}: {
  onClick: () => void;
  children?: string;
}) {
  return (
    <button className="primary" onClick={onClick}>
      {children}
    </button>
  );
}

function TrustMap({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const [zones, setZones] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ACTORS.map((actor) => [actor.id, actor.id === 'client' ? 'Browser session' : actor.expected]),
    ),
  );
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [selected, setSelected] = useState('client');
  const checkMap = () => {
    const actorChecks = ACTORS.map((actor, index) => ({
      id: `actor-${actor.id}`,
      label: actor.name,
      expected: actor.expected,
      observed: zones[actor.id],
      passed: zones[actor.id] === actor.expected,
      trace: `trace_local_00${index + 1}`,
    }));
    const routeChecks: CheckResult[] = [
      {
        id: 'front',
        label: 'Authorization redirect',
        expected: 'front-channel dashed route',
        observed: 'UA ⇢ OP ⇢ UA',
        passed: true,
        trace: 'trace_local_004',
      },
      {
        id: 'back',
        label: 'Token exchange',
        expected: 'back-channel TLS route',
        observed: 'Client ⇄ OP',
        passed: true,
        trace: 'trace_local_005',
      },
    ];
    const next = [...actorChecks, ...routeChecks];
    setChecks(next);
    const passed = next.every((item) => item.passed);
    onResult(passed);
    if (passed) {
      announce('M0 passed. Six actors and both channel types satisfy their trust boundaries.');
    } else {
      const firstIncorrect = ACTORS.find((actor) => zones[actor.id] !== actor.expected);
      if (firstIncorrect) setSelected(firstIncorrect.id);
      announce('Map needs repair. The incorrect actor remains selected.');
    }
  };
  return (
    <div className="module" id="trace_local_001">
      <ol className="instruction-strip" aria-label="Trust map instructions">
        <li>1. Select an actor</li>
        <li>2. Choose its zone</li>
        <li>3. Check the map</li>
      </ol>
      <div className="module-toolbar">
        <span className="local-chip">6 ACTORS · 2 BOUNDARIES</span>
        <button
          className="secondary"
          onClick={() =>
            announce(
              'Hint: keep browser actors together; attacker stays outside every trusted zone.',
            )
          }
        >
          Hint
        </button>
        <RunButton onClick={checkMap}>Check map</RunButton>
      </div>
      <div
        className="trust-map"
        role="group"
        aria-label="Actor trust map. Select an actor, then choose its zone."
      >
        <div className="boundary browser-boundary">
          <span>Browser session</span>
        </div>
        <div className="boundary server-boundary">
          <span>Server trust boundary</span>
        </div>
        <div className="route front">
          <span>① front channel · redirect</span>
        </div>
        <div className="route back">
          <span>② back channel · TLS</span>
        </div>
        <div className="actor-grid">
          {ACTORS.map((actor) => (
            <button
              key={actor.id}
              className={`actor actor-${actor.id} ${selected === actor.id ? 'selected' : ''}`}
              aria-pressed={selected === actor.id}
              onClick={() => {
                setSelected(actor.id);
                announce(`${actor.name}, selected, ${zones[actor.id]}.`);
              }}
            >
              <span className="actor-mark" aria-hidden="true">
                {actor.mark}
              </span>
              <span className="actor-name">{actor.name}</span>
              <small className="actor-zone">{zones[actor.id]}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="channel-legend" aria-label="Channel legend">
        <span>
          <i className="front-key" aria-hidden="true" /> Front channel · browser redirect
        </span>
        <span>
          <i className="back-key" aria-hidden="true" /> Back channel · direct TLS exchange
        </span>
      </div>
      <div className="move-control">
        <label htmlFor="actor-zone">
          Move {ACTORS.find((actor) => actor.id === selected)?.name} to zone
        </label>
        <select
          id="actor-zone"
          value={zones[selected]}
          onChange={(event) => {
            setZones({ ...zones, [selected]: event.target.value });
            announce(`${selected} moved to ${event.target.value}.`);
          }}
        >
          <option>Browser session</option>
          <option>Trusted application</option>
          <option>Issuer boundary</option>
          <option>Resource boundary</option>
          <option>Untrusted network</option>
        </select>
      </div>
      <ResultTable checks={checks} title="Trust-map evidence" />
    </div>
  );
}

function PkceComposer({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const [messages, setMessages] = useState(SEQUENCE);
  const [config, setConfig] = useState({
    responseType: 'code',
    clientId: 'client_notes_web',
    redirectUri: 'https://client.local/callback',
    scope: 'openid notes.read',
    state: 'state_local_9X4',
    challengeMethod: 'S256',
    verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    codeUsed: false,
    codeExpired: false,
  });
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= messages.length) return;
    const copy = [...messages];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setMessages(copy);
    announce(`${copy[target].type} moved to position ${target + 1}.`);
  };
  const run = async () => {
    const orderSafe = messages.every((message, index) => message.id === SEQUENCE[index].id);
    const flowChecks = await checkPkceFlow(config);
    const next: CheckResult[] = [
      {
        id: 'message-order',
        label: 'Message order',
        expected: SEQUENCE.map((item) => item.type).join(' → '),
        observed: messages.map((item) => item.type).join(' → '),
        passed: orderSafe,
        trace: 'trace_local_006',
      },
      ...flowChecks,
    ];
    setChecks(next);
    const passed = next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce(
        'M1 passed. The code is issuer-bound, exact-redirected, unused, unexpired, and S256-bound.',
      );
    } else announce(`${next.filter((check) => !check.passed).length} flow checks need repair.`);
  };
  const replay = async () => {
    setConfig((current) => ({ ...current, codeUsed: true }));
    const next = await checkPkceFlow({ ...config, codeUsed: true });
    setChecks(next);
    onResult(false);
    announce('Replay rejected: code_demo_7K2 was already consumed.');
  };
  return (
    <div className="module" id="trace_local_006">
      <div className="module-toolbar">
        <span className="local-chip">AUTHORIZATION CODE · PKCE S256</span>
        <button className="secondary" onClick={replay}>
          Try code replay
        </button>
        <RunButton onClick={run} />
      </div>
      <div className="split-view">
        <ol className="sequence" aria-label="Authorization sequence">
          {messages.map((message, index) => (
            <li
              key={message.id}
              data-testid="sequence-message"
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const source = Number(event.dataTransfer.getData('text/plain'));
                move(source, index - source);
              }}
            >
              <span className="ordinal">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{message.type}</strong>
                <span>{message.route}</span>
                <code>{message.object}</code>
                <em>{message.channel}</em>
              </div>
              <div className="reorder">
                <button
                  aria-label={`Move ${message.type} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${message.type} down`}
                  disabled={index === messages.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="parameter-grid" aria-label="Authorization parameters">
          {[
            ['responseType', 'response_type'],
            ['clientId', 'client_id'],
            ['redirectUri', 'redirect_uri'],
            ['scope', 'scope'],
            ['state', 'state'],
            ['challengeMethod', 'code_challenge_method'],
            ['verifier', 'code_verifier'],
            ['codeChallenge', 'code_challenge'],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={String(config[key as keyof typeof config])}
                onChange={(event) => setConfig({ ...config, [key]: event.target.value })}
              />
            </label>
          ))}
          <div className="code-life">
            <span>code_demo_7K2</span>
            <span className={config.codeUsed ? 'used' : 'unused'}>
              {config.codeUsed ? 'USED · REJECT NEXT' : 'UNUSED · TTL 60s'}
            </span>
            <button
              className="text-button"
              onClick={() => setConfig({ ...config, codeUsed: false })}
            >
              Reset code fixture
            </button>
          </div>
        </div>
      </div>
      <ResultTable checks={checks} title="Authorization server checks" />
    </div>
  );
}

function ScopeLab({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const scopes = ['openid', 'notes.read', 'notes.write', 'profile'];
  const [requested, setRequested] = useState(['openid', 'notes.read']);
  const [granted, setGranted] = useState(['openid', 'notes.read']);
  const [denied, setDenied] = useState(['notes.write']);
  const [resource, setResource] = useState('api://notes');
  const [audience, setAudience] = useState('api://notes');
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const toggle = (value: string, values: string[], update: (next: string[]) => void) =>
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const run = () => {
    const next = checkScopeSelection({ requested, granted, denied, resource, audience });
    setChecks(next);
    const passed = next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce('M2 passed. Read note succeeds with zero unnecessary permissions.');
    } else announce('Scope set needs repair. Check the named permission and audience.');
  };
  return (
    <div className="module" id="trace_local_008">
      <div className="module-toolbar">
        <span className="local-chip">TASK · READ ONE NOTE</span>
        <RunButton onClick={run} />
      </div>
      <div className="scope-board">
        {(
          [
            ['Requested', requested, setRequested],
            ['Granted', granted, setGranted],
            ['Denied', denied, setDenied],
          ] as const
        ).map(([label, values, update]) => (
          <fieldset key={label}>
            <legend>{label}</legend>
            {scopes.map((scope) => (
              <label className="scope-tile" key={scope}>
                <input
                  type="checkbox"
                  checked={values.includes(scope)}
                  disabled={label === 'Granted' && !requested.includes(scope)}
                  onChange={() => toggle(scope, [...values], update as (next: string[]) => void)}
                />
                <span>{scope}</span>
                <small>
                  {scope === 'notes.write'
                    ? 'Modify all notes · not needed'
                    : scope === 'notes.read'
                      ? 'Read notes · required'
                      : scope === 'openid'
                        ? 'Request identity · required'
                        : 'Profile claims · not needed'}
                </small>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="inline-fields">
        <label>
          resource indicator
          <input value={resource} onChange={(event) => setResource(event.target.value)} />
        </label>
        <span className="route-arrow">→</span>
        <label>
          expected access-token aud
          <input value={audience} onChange={(event) => setAudience(event.target.value)} />
        </label>
        <div className="privilege-meter">
          <span>Least privilege</span>
          <strong>
            {granted.filter((scope) => !['openid', 'notes.read'].includes(scope)).length === 0
              ? '0 extra'
              : `${granted.filter((scope) => !['openid', 'notes.read'].includes(scope)).length} extra`}
          </strong>
        </div>
      </div>
      <ResultTable checks={checks} title="Consent + API evidence" />
    </div>
  );
}

function TokenLab({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const [token, setToken] = useState(SYNTHETIC_ID_TOKEN);
  const [decoded, setDecoded] = useState<ReturnType<typeof decodeSyntheticJwt> | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const inspect = () => {
    try {
      setDecoded(decodeSyntheticJwt(token));
      announce('Synthetic token decoded for inspection. Signature not verified.');
    } catch (error) {
      announce((error as Error).message);
    }
  };
  const run = () => {
    if (!decoded) {
      onResult(false);
      announce('Decode the synthetic fixture first.');
      return;
    }
    const expected: Array<[keyof typeof decoded.payload, string | number]> = [
      ['iss', 'https://op.local'],
      ['aud', 'client_notes_web'],
      ['nonce', 'nonce_local_N42'],
      ['exp', 4102444800],
      ['azp', 'client_notes_web'],
      ['at_hash', 'hash_demo_A17'],
    ];
    const next = expected.map(([key, value], index) => ({
      id: String(key),
      label: String(key),
      expected: String(value),
      observed: String(decoded.payload[key] ?? '(missing)'),
      passed: decoded.payload[key] === value,
      trace: `trace_local_01${index + 4}`,
    }));
    next.push({
      id: 'decode-boundary',
      label: 'Cryptographic boundary',
      expected: 'Signature not verified',
      observed: acknowledged ? 'Signature not verified' : 'Not acknowledged',
      passed: acknowledged && !decoded.signatureVerified,
      trace: 'trace_local_019',
    });
    setChecks(next);
    const passed = next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce('M3 passed. Claims classified; signature remains unverified.');
    } else announce('Token inspection needs repair.');
  };
  return (
    <div className="module token-lab" id="trace_local_014">
      <div className="decode-banner">Decoded for inspection · Signature not verified</div>
      <div className="module-toolbar">
        <span className="local-chip">FIXTURE · SYNTHETIC LOCAL TOKEN</span>
        <button className="secondary" onClick={inspect}>
          Decode for inspection
        </button>
        <RunButton onClick={run}>Accept inspection</RunButton>
      </div>
      <label className="token-input">
        Synthetic token fixture
        <textarea
          rows={3}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          spellCheck={false}
        />
      </label>
      <label className="ack">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />{' '}
        I understand: decoding did not verify this signature.
      </label>
      {decoded && (
        <div className="token-regions">
          <article>
            <span>H · HEADER</span>
            <pre>{JSON.stringify(decoded.header, null, 2)}</pre>
          </article>
          <article>
            <span>P · PAYLOAD</span>
            <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
          </article>
          <article className="signature">
            <span>S · SIGNATURE</span>
            <pre>{decoded.signature}</pre>
            <strong>NOT VERIFIED</strong>
          </article>
        </div>
      )}
      <div className="purpose-pair">
        <div>
          <strong>Access token</strong>
          <span>aud → api://notes</span>
          <small>Presented to Resource Server</small>
        </div>
        <div>
          <strong>ID token</strong>
          <span>aud → client_notes_web</span>
          <small>Consumed by Client</small>
        </div>
      </div>
      <ResultTable checks={checks} title="Claim classification" />
    </div>
  );
}

function IdentityLab({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const [metadata, setMetadata] = useState<typeof DISCOVERY_FIXTURE | null>(null);
  const [subjectType, setSubjectType] = useState<'public' | 'pairwise'>('public');
  const [userinfoSub, setUserinfoSub] = useState('user_ada');
  const [nonce, setNonce] = useState('nonce_local_N42');
  const [session, setSession] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const scenarioSubject = subjectType === 'public' ? 'user_ada' : 'pair_ada_notes';
  const run = () => {
    if (!metadata) {
      onResult(false);
      announce('Load the local metadata fixture first.');
      return;
    }
    const next = [
      ...validateDiscovery(metadata),
      {
        id: 'openid',
        label: 'Identity request',
        expected: 'openid + state + nonce',
        observed: `openid · state_local_9X4 · ${nonce}`,
        passed: nonce === 'nonce_local_N42',
        trace: 'trace_local_025',
      },
      {
        id: 'subject',
        label: 'UserInfo subject',
        expected: `${scenarioSubject} equals ID token sub`,
        observed: `${userinfoSub} ↔ ${scenarioSubject}`,
        passed: userinfoSub === scenarioSubject,
        trace: 'trace_local_026',
      },
      {
        id: 'session',
        label: 'Local session event',
        expected: 'session started',
        observed: session ? `start · ${scenarioSubject}` : 'not started',
        passed: session,
        trace: 'trace_local_027',
      },
      {
        id: 'signature',
        label: 'Signature verification',
        expected: 'Not performed in this learning UI',
        observed: 'Not performed in this learning UI',
        passed: true,
        trace: 'trace_local_028',
      },
    ];
    setChecks(next);
    const passed = next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce(
        'M4 passed. Metadata, nonce, subject, and local session share one issuer-bound trace.',
      );
    } else announce('Identity trace needs repair at its named origin.');
  };
  return (
    <div className="module" id="trace_local_020">
      <div className="module-toolbar">
        <span className="local-chip">https://op.local/.well-known/openid-configuration</span>
        <button
          className="secondary"
          onClick={() => {
            setMetadata(DISCOVERY_FIXTURE);
            announce('Local discovery fixture loaded. No network request made.');
          }}
        >
          Load local metadata
        </button>
        <RunButton onClick={run} />
      </div>
      <div className="identity-trace">
        <article>
          <span className="eyebrow">01 · DISCOVER</span>
          <strong>{metadata?.issuer ?? 'No metadata loaded'}</strong>
          <code>{metadata?.authorization_endpoint ?? 'authorization_endpoint'}</code>
          <code>{metadata?.token_endpoint ?? 'token_endpoint'}</code>
        </article>
        <article>
          <span className="eyebrow">02 · REQUEST</span>
          <strong>openid · state</strong>
          <label>
            nonce
            <input value={nonce} onChange={(event) => setNonce(event.target.value)} />
          </label>
        </article>
        <article>
          <span className="eyebrow">03 · CONSUME</span>
          <strong>ID token → client</strong>
          <span>iss · aud · exp · nonce</span>
          <small>Signature verification: Not performed in this learning UI</small>
        </article>
        <article>
          <span className="eyebrow">04 · RECONCILE</span>
          <label>
            UserInfo sub
            <input value={userinfoSub} onChange={(event) => setUserinfoSub(event.target.value)} />
          </label>
          <label>
            Subject type
            <select
              value={subjectType}
              onChange={(event) => {
                const nextType = event.target.value as 'public' | 'pairwise';
                setSubjectType(nextType);
                setUserinfoSub(nextType === 'public' ? 'user_ada' : 'pair_ada_notes');
              }}
            >
              <option value="public">public · user_ada</option>
              <option value="pairwise">pairwise · pair_ada_notes</option>
            </select>
          </label>
        </article>
        <article>
          <span className="eyebrow">05 · SESSION</span>
          <strong>{session ? `START · ${scenarioSubject}` : 'No local session'}</strong>
          <button className="secondary" onClick={() => setSession(!session)}>
            {session ? 'End local session' : 'Start local session'}
          </button>
        </article>
      </div>
      <ResultTable checks={checks} title="Identity trace evidence" />
    </div>
  );
}

function ThreatArcade({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  const [selected, setSelected] = useState(THREATS[0]);
  const [repairs, setRepairs] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<'idle' | 'compromised' | 'safe'>('idle');
  const run = () => {
    const safe = Boolean(repairs[selected.id]);
    setOutcome(safe ? 'safe' : 'compromised');
    if (safe) announce(`SAFE. ${selected.name}: ${selected.invariant}.`);
    else
      announce(
        `COMPROMISED. ${selected.name}. ${selected.object} at ${selected.boundary}. ${selected.consequence}`,
      );
    const all = THREATS.every(
      (threat) => repairs[threat.id] || (threat.id === selected.id && safe),
    );
    onResult(all);
  };
  return (
    <div className="module" id="trace_local_030">
      <div className="threat-layout">
        <div className="threat-list" aria-label="Threat challenges">
          {THREATS.map((threat, index) => (
            <button
              key={threat.id}
              aria-label={`Challenge ${index + 1}: ${threat.name}`}
              className={selected.id === threat.id ? 'selected' : ''}
              onClick={() => {
                setSelected(threat);
                setOutcome('idle');
              }}
            >
              <span className="threat-glyph" aria-hidden="true">
                {threat.glyph}
              </span>
              <span>
                <strong>
                  {String(index + 1).padStart(2, '0')} · {threat.name}
                </strong>
                <small>{repairs[threat.id] ? 'SAFE · repaired' : 'UNSAFE fixture'}</small>
              </span>
            </button>
          ))}
        </div>
        <section className={`challenge ${outcome}`} aria-label={`${selected.name} challenge`}>
          <div className="challenge-head">
            <span className="threat-glyph large" aria-hidden="true">
              {selected.glyph}
            </span>
            <div>
              <span className="eyebrow">AFFECTED · {selected.boundary}</span>
              <h3>{selected.name}</h3>
            </div>
          </div>
          <div className="unsafe-route">
            <span>UNSAFE</span>
            <strong>{selected.unsafe}</strong>
            <code>{selected.object}</code>
          </div>
          {outcome === 'compromised' && (
            <div className="compromised">
              <strong>COMPROMISED</strong>
              <span>{selected.consequence}</span>
            </div>
          )}
          {outcome === 'safe' && (
            <div className="safe-result">
              <strong>SAFE</strong>
              <span>{selected.invariant}</span>
            </div>
          )}
          <label className="repair-toggle">
            <input
              type="checkbox"
              checked={Boolean(repairs[selected.id])}
              onChange={(event) => {
                setRepairs({ ...repairs, [selected.id]: event.target.checked });
                setOutcome('idle');
              }}
            />
            <span>{selected.repair}</span>
          </label>
          <div className="module-toolbar">
            <button
              className="secondary"
              onClick={() => announce(`Hint: enforce this invariant—${selected.invariant}.`)}
            >
              Hint
            </button>
            <RunButton onClick={run}>Predict outcome</RunButton>
          </div>
        </section>
      </div>
      <div className="arcade-progress">
        <span>{Object.values(repairs).filter(Boolean).length}/9 repairs configured</span>
        <div>
          {THREATS.map((threat) => (
            <i key={threat.id} className={repairs[threat.id] ? 'done' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemaBench({
  onResult,
  announce,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
}) {
  type Pane = 'http' | 'json' | 'diff';
  const panes: Pane[] = ['http', 'json', 'diff'];
  const [pane, setPane] = useState<Pane>('http');
  const tabRefs = useRef<Partial<Record<Pane, HTMLButtonElement | null>>>({});
  const [history, setHistory] = useState([{ http: INITIAL_HTTP, json: INITIAL_JSON }]);
  const [position, setPosition] = useState(0);
  const snapshot = history[position] ?? history[0];
  const http = snapshot.http;
  const json = snapshot.json;
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const edit = (kind: 'http' | 'json', value: string) => {
    const nextSnapshot = { ...snapshot, [kind]: value };
    setHistory([...history.slice(0, position + 1), nextSnapshot]);
    setPosition(position + 1);
  };
  const run = () => {
    let parsed = false;
    let parsedJson: Record<string, unknown> = {};
    try {
      const value: unknown = JSON.parse(json);
      parsed = true;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        parsedJson = value as Record<string, unknown>;
      }
    } catch {
      parsed = false;
    }
    const schemaMatches =
      parsedJson.issuer === 'https://op.local' &&
      parsedJson.audience === 'api://notes' &&
      parsedJson.subject === 'user_ada';
    const next: CheckResult[] = [
      {
        id: 'http-syntax',
        label: 'HTTP request',
        expected: 'POST /token + Host + form body',
        observed: http.includes('POST /token') ? 'request line present' : 'request line missing',
        passed: http.includes('POST /token') && http.includes('grant_type=authorization_code'),
        trace: 'trace_local_050',
      },
      {
        id: 'json-syntax',
        label: 'JSON syntax',
        expected: 'parseable JSON',
        observed: parsed ? 'parsed' : 'syntax error',
        passed: parsed,
        trace: 'trace_local_051',
      },
      {
        id: 'json-schema',
        label: 'Local schema',
        expected: 'issuer, audience, subject',
        observed: parsed && schemaMatches ? 'all fields match' : 'schema field mismatch',
        passed: parsed && schemaMatches,
        trace: 'trace_local_052',
      },
    ];
    setChecks(next);
    const passed = next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce('M6 passed. Local parse, schema, and deterministic response checks pass.');
    } else announce('Bench needs repair. Syntax and schema diagnostics are listed separately.');
  };
  const reset = () => {
    if (
      (http !== INITIAL_HTTP || json !== INITIAL_JSON) &&
      !globalThis.confirm('Reset both editors to the deterministic local fixture?')
    )
      return;
    setHistory([{ http: INITIAL_HTTP, json: INITIAL_JSON }]);
    setPosition(0);
    announce('Deterministic local fixture restored.');
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(`${http}\n\n${json}`);
    announce('Synthetic exchange copied.');
  };
  return (
    <div className="module schema-bench" id="trace_local_050">
      <div className="module-toolbar">
        <div className="tabs" role="tablist" aria-label="Schema bench panes">
          {panes.map((item) => (
            <button
              role="tab"
              id={`schema-tab-${item}`}
              aria-controls={`schema-panel-${item}`}
              aria-selected={pane === item}
              tabIndex={pane === item ? 0 : -1}
              ref={(node) => {
                tabRefs.current[item] = node;
              }}
              key={item}
              onClick={() => setPane(item)}
              onKeyDown={(event) => {
                const currentIndex = panes.indexOf(item);
                const nextPane =
                  event.key === 'Home'
                    ? panes[0]
                    : event.key === 'End'
                      ? panes[panes.length - 1]
                      : event.key === 'ArrowRight'
                        ? panes[(currentIndex + 1) % panes.length]
                        : event.key === 'ArrowLeft'
                          ? panes[(currentIndex - 1 + panes.length) % panes.length]
                          : null;
                if (!nextPane) return;
                event.preventDefault();
                setPane(nextPane);
                requestAnimationFrame(() => tabRefs.current[nextPane]?.focus());
              }}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          className="secondary"
          disabled={position <= 0}
          onClick={() => setPosition(Math.max(0, position - 1))}
        >
          Undo
        </button>
        <button
          className="secondary"
          disabled={position >= history.length - 1}
          onClick={() => setPosition(position + 1)}
        >
          Redo
        </button>
        <button className="secondary" onClick={copy}>
          Copy synthetic
        </button>
        <button className="secondary" onClick={reset}>
          Reset fixture
        </button>
        <RunButton onClick={run} />
      </div>
      {pane === 'http' && (
        <label
          className="code-pane"
          role="tabpanel"
          id="schema-panel-http"
          aria-labelledby="schema-tab-http"
        >
          <span>HTTP editor · line 1</span>
          <textarea
            value={http}
            onChange={(event) => edit('http', event.target.value)}
            spellCheck={false}
          />
        </label>
      )}
      {pane === 'json' && (
        <label
          className="code-pane"
          role="tabpanel"
          id="schema-panel-json"
          aria-labelledby="schema-tab-json"
        >
          <span>JSON editor · local schema</span>
          <textarea
            value={json}
            onChange={(event) => edit('json', event.target.value)}
            spellCheck={false}
          />
        </label>
      )}
      {pane === 'diff' && (
        <div
          className="diff-view"
          role="tabpanel"
          id="schema-panel-diff"
          aria-labelledby="schema-tab-diff"
        >
          <div>
            <span className="eyebrow">RESET BASELINE</span>
            <pre>
              {INITIAL_HTTP}\n\n{INITIAL_JSON}
            </pre>
          </div>
          <div>
            <span className="eyebrow">
              CURRENT · {http === INITIAL_HTTP && json === INITIAL_JSON ? 'NO CHANGES' : 'DIRTY'}
            </span>
            <pre>
              {http}\n\n{json}
            </pre>
          </div>
        </div>
      )}
      <ResultTable checks={checks} title="Parser + schema evidence" />
    </div>
  );
}

function Capstone({
  onResult,
  announce,
  progress,
}: {
  onResult: (passed: boolean) => void;
  announce: (message: string) => void;
  progress: Progress;
}) {
  const [repairs, setRepairs] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [seed, setSeed] = useState<'FORGE-7K2-05' | 'FORGE-I42-05'>('FORGE-7K2-05');
  const faults = CAPSTONE_SCENARIOS[seed];
  const prerequisites = MILESTONES.slice(0, 7).filter(
    (milestone) => progress[milestone.id] !== 'passed',
  );
  const run = () => {
    const next = checkCapstone(repairs, faults);
    setChecks(next);
    const passed = prerequisites.length === 0 && next.every((check) => check.passed);
    onResult(passed);
    if (passed) {
      announce(
        'Capstone passed. Zero critical faults; five threat families repaired. Signature verification remains outside this UI.',
      );
    } else if (prerequisites.length) {
      announce(
        `Capstone blocked. Repair ${prerequisites.map((item) => item.id).join(', ')} first.`,
      );
    } else
      announce(`${next.filter((check) => !check.passed).length} critical capstone checks remain.`);
  };
  return (
    <div className="module" id="trace_local_100">
      <div className="module-toolbar">
        <span className="local-chip">FAULT SEED · {seed}</span>
        <button
          className="secondary"
          onClick={() => {
            setSeed(seed === 'FORGE-7K2-05' ? 'FORGE-I42-05' : 'FORGE-7K2-05');
            setRepairs({});
            setChecks([]);
          }}
        >
          New deterministic seed
        </button>
        <RunButton onClick={run}>Run all checks</RunButton>
      </div>
      {prerequisites.length > 0 && (
        <div className="advisory">
          Prerequisites missing: {prerequisites.map((item) => item.id).join(', ')}. Repair these
          gates before the capstone can pass.
        </div>
      )}
      <div className="forge-trace">
        <div className="forge-line" aria-hidden="true" />
        {['Discover', 'Authorize', 'Redeem', 'Consume', 'Call API', 'Session'].map(
          (phase, index) => (
            <div key={phase}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{phase}</strong>
              <small>
                {index === 0
                  ? 'https://op.local'
                  : index === 1
                    ? 'state · nonce · S256'
                    : index === 2
                      ? 'code once'
                      : index === 3
                        ? 'iss · aud · exp · nonce'
                        : index === 4
                          ? 'aud api://notes'
                          : 'sub user_ada'}
              </small>
            </div>
          ),
        )}
      </div>
      <div className="fault-grid">
        {faults.map((fault) => (
          <label key={fault.id} className={repairs[fault.id] ? 'repaired' : ''}>
            <input
              type="checkbox"
              checked={Boolean(repairs[fault.id])}
              onChange={(event) => setRepairs({ ...repairs, [fault.id]: event.target.checked })}
            />
            <span className="eyebrow">
              {fault.phase} · {fault.threat}
            </span>
            <strong>{repairs[fault.id] ? fault.expected : fault.observed}</strong>
            <small>
              {repairs[fault.id] ? 'REPAIRED · ready to check' : 'CRITICAL · repair required'}
            </small>
          </label>
        ))}
      </div>
      <div className="decode-banner">
        Decode evidence only · Cryptographic signature verification not performed
      </div>
      <ResultTable checks={checks} title="Capstone security evidence" />
    </div>
  );
}

function GuidedLearning({
  onEnterPractice,
}: {
  onEnterPractice: (milestone: MilestoneId) => void;
}) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('server');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [redirectCaseId, setRedirectCaseId] = useState<RedirectCaseId>('exact');
  const [diagnosis, setDiagnosis] = useState('Choose a case, then run the local diagnosis.');
  const [troubleCaseId, setTroubleCaseId] = useState<RedirectCaseId>('path');
  const scenarioTabRefs = useRef<Partial<Record<ScenarioId, HTMLButtonElement | null>>>({});
  const scenario = GUIDE_SCENARIOS.find((item) => item.id === scenarioId) ?? GUIDE_SCENARIOS[0];
  const redirectCase =
    REDIRECT_CASES.find((item) => item.id === redirectCaseId) ?? REDIRECT_CASES[0];
  const troubleCase = REDIRECT_CASES.find((item) => item.id === troubleCaseId) ?? REDIRECT_CASES[1];
  const registeredRedirect = scenario.redirect;
  const redirectMismatchIds: RedirectCaseId[] = [
    'scheme',
    'host',
    'port',
    'path',
    'query',
    'encoding',
  ];
  const requestedRedirect = (() => {
    if (!redirectMismatchIds.includes(redirectCase.id)) return registeredRedirect;
    const value = new URL(registeredRedirect);
    if (redirectCase.id === 'scheme')
      value.protocol = value.protocol === 'https:' ? 'http:' : 'https:';
    if (redirectCase.id === 'host') value.hostname = 'wrong.example';
    if (redirectCase.id === 'port') value.port = '8443';
    if (redirectCase.id === 'path') value.pathname = `${value.pathname}/extra`;
    if (redirectCase.id === 'query') value.search = '?tenant=wrong';
    if (redirectCase.id === 'encoding') {
      value.pathname = value.pathname.replace('callback', 'call%62ack');
    }
    return value.toString();
  })();
  const callbackReached = redirectMismatchIds.includes(redirectCase.id)
    ? 'No callback followed'
    : redirectCase.id === 'browser'
      ? 'Browser blocked the token call or lost the transaction state'
      : `${registeredRedirect}?code=${redirectCase.id === 'grant' ? 'code_used_7K2' : 'code_demo_7K2'}${redirectCase.id === 'state' ? '' : '&state=state_local_9X4'}`;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= scenario.steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [playing, scenario.steps.length]);

  const selectScenario = (next: ScenarioId) => {
    setScenarioId(next);
    setStep(0);
    setPlaying(false);
    setRedirectCaseId('exact');
    setDiagnosis('Choose a case, then run the local diagnosis.');
  };

  return (
    <main id="main" className="guide" tabIndex={-1}>
      <section className="guide-hero" aria-labelledby="guide-title">
        <div>
          <span className="eyebrow">GUIDED OIDC ORIENTATION · 6 SHORT STOPS</span>
          <h1 id="guide-title">Understand OIDC before you wire it</h1>
          <p>
            Follow one browser trip from request to callback, learn what must match, then repair the
            same failures in the local practice lab.
          </p>
          <div className="guide-actions">
            <button className="primary" onClick={() => onEnterPractice('M0')}>
              Enter practice lab
            </button>
            <button className="secondary" onClick={() => onEnterPractice('M1')}>
              Jump to PKCE practice
            </button>
          </div>
          <a className="guide-resource-link" href="#guide-cheat-sheet">
            Open the OIDC field cheat sheet <span>One-page PDF included →</span>
          </a>
        </div>
        <aside className="guide-safety" aria-label="Learning environment safety boundary">
          <span className="status-dot" aria-hidden="true" />
          <strong>LOCAL FIXTURES ONLY</strong>
          <p>
            Use fabricated values only. Everything stays in this browser, and decode examples never
            verify signatures.
          </p>
        </aside>
      </section>

      <nav className="journey-map" aria-label="Guided learning sections">
        {['Understand', 'Watch', 'Diagnose', 'Troubleshoot', 'Cheat sheet', 'Practice'].map(
          (label, index) => (
            <a key={label} href={`#guide-${label.toLowerCase().replace(' ', '-')}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </a>
          ),
        )}
      </nav>

      <section id="guide-understand" className="guide-section understand-section">
        <div className="guide-section-heading">
          <span className="eyebrow">01 · UNDERSTAND</span>
          <h2>OAuth grants access. OIDC adds identity.</h2>
          <p>
            OAuth lets a client call an API with limited permission. OpenID Connect uses OAuth’s
            flow and adds an ID token so the client can establish who signed in. An access token is
            for the API; an ID token is for the client.
          </p>
        </div>
        <div className="concept-compare">
          <article>
            <span className="concept-mark" aria-hidden="true">
              A
            </span>
            <div>
              <h3>OAuth 2.0</h3>
              <p>“May this client read my notes?”</p>
              <strong>Result: an access token for the resource API.</strong>
            </div>
          </article>
          <article>
            <span className="concept-mark" aria-hidden="true">
              ID
            </span>
            <div>
              <h3>OpenID Connect</h3>
              <p>“Who completed this sign-in?”</p>
              <strong>Result: an ID token for the client, plus optional API access.</strong>
            </div>
          </article>
        </div>
        <ol className="actor-primer" aria-label="Five actors in the flow">
          <li>
            <strong>Person</strong>
            <span>Chooses to sign in or grant access.</span>
          </li>
          <li>
            <strong>User agent</strong>
            <span>The browser carries front-channel redirects.</span>
          </li>
          <li>
            <strong>Client</strong>
            <span>The web, SPA, or native app asking for a result.</span>
          </li>
          <li>
            <strong>Provider</strong>
            <span>The authorization server; for OIDC, also the identity issuer.</span>
          </li>
          <li>
            <strong>Resource API</strong>
            <span>Accepts access tokens meant for that API.</span>
          </li>
        </ol>
      </section>

      <section id="guide-watch" className="guide-section watch-section">
        <div className="guide-section-heading">
          <span className="eyebrow">02 · WATCH</span>
          <h2>Watch the browser carry the flow</h2>
          <p>Select an application shape, then move through the messages at your own pace.</p>
        </div>
        <div className="scenario-tabs" role="tablist" aria-label="Application scenarios">
          {GUIDE_SCENARIOS.map((item) => (
            <button
              key={item.id}
              id={`scenario-tab-${item.id}`}
              role="tab"
              aria-selected={scenario.id === item.id}
              aria-controls="scenario-panel"
              tabIndex={scenario.id === item.id ? 0 : -1}
              ref={(node) => {
                scenarioTabRefs.current[item.id] = node;
              }}
              onClick={() => selectScenario(item.id)}
              onKeyDown={(event) => {
                const current = GUIDE_SCENARIOS.findIndex((entry) => entry.id === item.id);
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? GUIDE_SCENARIOS.length - 1
                      : event.key === 'ArrowRight'
                        ? (current + 1) % GUIDE_SCENARIOS.length
                        : event.key === 'ArrowLeft'
                          ? (current - 1 + GUIDE_SCENARIOS.length) % GUIDE_SCENARIOS.length
                          : -1;
                if (next < 0) return;
                event.preventDefault();
                const nextId = GUIDE_SCENARIOS[next].id;
                selectScenario(nextId);
                requestAnimationFrame(() => scenarioTabRefs.current[nextId]?.focus());
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          id="scenario-panel"
          className="scenario-workflow"
          role="tabpanel"
          aria-labelledby={`scenario-tab-${scenario.id}`}
        >
          <div className="scenario-summary">
            <div>
              <span className="eyebrow">ACTORS IN THIS SCENARIO</span>
              <ul>
                {scenario.actors.map((actor) => (
                  <li key={actor}>{actor}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="eyebrow">REDIRECT FORM</span>
              <code>{scenario.redirect}</code>
              {scenario.id === 'native' && (
                <small>Claimed HTTPS app link · private-use and loopback are alternatives</small>
              )}
            </div>
            <div>
              <span className="eyebrow">TOKEN RESULT</span>
              <strong>{scenario.tokenResult}</strong>
            </div>
            <p>{scenario.useWhen}</p>
          </div>
          <div
            className="actor-flow-graph"
            role="group"
            aria-label={`${scenario.label} actor graph`}
          >
            {scenario.actors.map((actor, index) => {
              const active = scenario.steps[step].route.toLowerCase().includes(actor.toLowerCase());
              return (
                <div className={`flow-actor ${active ? 'active' : ''}`} key={actor}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{actor}</strong>
                  {index < scenario.actors.length - 1 && (
                    <i className="flow-edge" aria-hidden="true">
                      →
                    </i>
                  )}
                </div>
              );
            })}
            <p className="active-message" key={`${scenario.id}-${step}`}>
              <span aria-hidden="true" />
              {`Active message · ${scenario.steps[step].route}`}
            </p>
          </div>
          <div className="workflow-stage">
            <ol className="workflow-track" aria-label={`${scenario.label} workflow steps`}>
              {scenario.steps.map((item, index) => (
                <li
                  key={item.title}
                  className={index === step ? 'active' : index < step ? 'complete' : ''}
                  aria-current={index === step ? 'step' : undefined}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
            </ol>
            <div
              className="workflow-status"
              role="status"
              aria-label="Workflow step"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>
                Step {step + 1} of {scenario.steps.length}
              </span>
              <h3>{scenario.steps[step].title}</h3>
              <code>{scenario.steps[step].route}</code>
              <p>{scenario.steps[step].detail}</p>
            </div>
          </div>
          <div className="workflow-controls" aria-label="Workflow playback controls">
            <button
              className="secondary"
              onClick={() => setPlaying(!playing)}
              aria-pressed={playing}
            >
              {playing ? 'Pause flow' : 'Play flow'}
            </button>
            <button
              className="secondary"
              disabled={step === 0}
              onClick={() => {
                setPlaying(false);
                setStep(step - 1);
              }}
            >
              Previous step
            </button>
            <button
              className="secondary"
              disabled={step === scenario.steps.length - 1}
              onClick={() => {
                setPlaying(false);
                setStep(step + 1);
              }}
            >
              Next step
            </button>
            <button
              className="secondary"
              onClick={() => {
                setPlaying(false);
                setStep(0);
              }}
            >
              Restart flow
            </button>
          </div>
          <p className="pkce-note">
            PKCE S256 is required for public clients and recommended for every client type.
          </p>
        </div>
      </section>

      <section id="guide-diagnose" className="guide-section redirect-section">
        <div className="guide-section-heading">
          <span className="eyebrow">03 · DIAGNOSE</span>
          <h2>Redirect URI lens</h2>
          <p>
            The callback is the client endpoint, claimed app link, private-use URI, or loopback
            listener reached through the user agent. It receives the authorization response; it is
            not the token endpoint.
          </p>
        </div>
        <div className="redirect-values" aria-label="Redirect URI comparison">
          <label>
            Registered URI<code>{registeredRedirect}</code>
          </label>
          <label>
            Requested redirect_uri<code>{requestedRedirect}</code>
          </label>
          <label>
            Callback actually reached<code>{callbackReached}</code>
          </label>
        </div>
        <p className="exact-rule">
          Exact registered/requested matching is the default security rule. Native loopback
          redirects have one narrow exception: the operating system may choose the port.
        </p>
        <div className="case-picker" aria-label="Redirect diagnosis cases">
          {REDIRECT_CASES.map((item) => (
            <button
              key={item.id}
              className={redirectCase.id === item.id ? 'selected' : ''}
              aria-pressed={redirectCase.id === item.id}
              onClick={() => {
                setRedirectCaseId(item.id);
                setDiagnosis('Case loaded. Run the local diagnosis.');
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="diagnosis-action">
          <button className="primary" onClick={() => setDiagnosis(redirectCase.diagnosis)}>
            Diagnose redirect
          </button>
          <div role="status" aria-label="Redirect diagnosis" aria-live="polite">
            <strong>Local result</strong>
            <p>{diagnosis}</p>
          </div>
        </div>
      </section>

      <section id="guide-troubleshoot" className="guide-section troubleshoot-section">
        <div className="guide-section-heading">
          <span className="eyebrow">04 · TROUBLESHOOT</span>
          <h2>Troubleshoot from the trace</h2>
          <p>
            Start with what failed, name the invariant, find its trace, then inspect one next thing.
          </p>
        </div>
        <div className="trouble-layout">
          <div className="trouble-list" aria-label="Troubleshooting cases">
            {REDIRECT_CASES.filter((item) => TROUBLESHOOT_CASE_IDS.includes(item.id)).map(
              (item) => (
                <button
                  key={item.id}
                  aria-label={`Troubleshoot ${item.id === 'path' ? 'redirect mismatch' : item.label}`}
                  className={troubleCase.id === item.id ? 'selected' : ''}
                  aria-pressed={troubleCase.id === item.id}
                  onClick={() => setTroubleCaseId(item.id)}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
          <article className="trouble-card">
            <dl>
              <div>
                <dt>Symptom</dt>
                <dd>{troubleCase.label}</dd>
              </div>
              <div>
                <dt>Failed invariant</dt>
                <dd>{troubleCase.diagnosis.split(':')[0]}</dd>
              </div>
              <div>
                <dt>Trace location</dt>
                <dd>
                  {troubleCase.id === 'grant'
                    ? 'Token endpoint response'
                    : troubleCase.id === 'claims'
                      ? 'ID token validation'
                      : troubleCase.id === 'browser'
                        ? 'Browser network + storage'
                        : 'Authorization request / callback'}
                </dd>
              </div>
              <div>
                <dt>Next check</dt>
                <dd>{troubleCase.diagnosis}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <CheatSheet />

      <section id="guide-practice" className="guide-section practice-callout">
        <div>
          <span className="eyebrow">06 · PRACTICE</span>
          <h2>Build the trace yourself</h2>
          <p>Eight local milestones turn the model into protocol and security checks.</p>
        </div>
        <div className="guide-actions">
          <button className="primary" onClick={() => onEnterPractice('M0')}>
            Start practice at M0
          </button>
          <button className="secondary" onClick={() => onEnterPractice('M1')}>
            Open PKCE milestone
          </button>
        </div>
      </section>
    </main>
  );
}

function Inspector({ milestone, status }: { milestone: Milestone; status: GateStatus }) {
  return (
    <aside className="inspector" aria-label="Current task inspector">
      <div>
        <span className="eyebrow">INSPECTOR · {milestone.trace}</span>
        <h2>{milestone.title}</h2>
        <p>{milestone.prompt}</p>
      </div>
      <dl>
        <div>
          <dt>Gate</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>browser · local</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>none required</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>stored on this device</dd>
        </div>
      </dl>
      <details>
        <summary>Keyboard map</summary>
        <ul>
          <li>
            <kbd>Tab</kbd> move controls
          </li>
          <li>
            <kbd>Enter</kbd> activate
          </li>
          <li>
            <kbd>↑ ↓</kbd> reorder messages
          </li>
          <li>
            <kbd>Ctrl Z</kbd> undo in bench
          </li>
          <li>
            <kbd>Esc</kbd> cancel or close
          </li>
        </ul>
      </details>
      <details>
        <summary>State vocabulary</summary>
        <p>
          Empty → ready → selected → editing → pending → success / error / compromised. Locked
          actions name their prerequisite; hints preserve edits.
        </p>
      </details>
      <a className="reference-link" href="#references">
        Protocol references ↓
      </a>
    </aside>
  );
}

export function App() {
  const [view, setView] = useState<'guide' | 'practice'>('guide');
  const [active, setActive] = useState<MilestoneId>('M0');
  const { progress, setProgress, mark } = useProgress();
  const [announcement, setAnnouncement] = useState(
    'Workbench ready. Synthetic local fixtures loaded.',
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('protocol-workbench-theme') === 'dark' ? 'dark' : 'light',
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const taskHeadingRef = useRef<HTMLHeadingElement>(null);
  const resetDialogRef = useRef<HTMLDivElement>(null);
  const resetInputRef = useRef<HTMLInputElement>(null);
  const resetOpenerRef = useRef<HTMLButtonElement>(null);
  const milestone = MILESTONES.find((item) => item.id === active) ?? MILESTONES[0];
  const status = progress[active] ?? 'not started';
  const passedCount = useMemo(
    () => Object.values(progress).filter((value) => value === 'passed').length,
    [progress],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('protocol-workbench-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (view === 'practice' && !progress[active]) mark(active, 'in progress');
  }, [active, view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!resetOpen) return;
    requestAnimationFrame(() => resetInputRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setResetOpen(false);
        setResetPhrase('');
        requestAnimationFrame(() => resetOpenerRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        resetDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [resetOpen]);
  const closeReset = () => {
    setResetOpen(false);
    setResetPhrase('');
    requestAnimationFrame(() => resetOpenerRef.current?.focus());
  };
  const recordResult = (id: MilestoneId, passed: boolean) => {
    setProgress((current) => {
      const next: Progress = { ...current, [id]: passed ? 'passed' : 'needs repair' };
      if (!passed) {
        const failedIndex = MILESTONES.findIndex((item) => item.id === id);
        for (const downstream of MILESTONES.slice(failedIndex + 1)) {
          if (current[downstream.id] === 'passed') next[downstream.id] = 'needs repair';
        }
      }
      return next;
    });
  };
  const selectMilestone = (id: MilestoneId) => {
    setActive(id);
    setAnnouncement(`${id} selected. ${MILESTONES.find((item) => item.id === id)?.prompt}`);
    requestAnimationFrame(() => {
      const main = mainRef.current;
      if (!main) return;
      if (window.innerWidth >= 900) {
        main.focus({ preventScroll: true });
        return;
      }
      const heading = taskHeadingRef.current;
      heading?.scrollIntoView({ block: 'start', behavior: 'auto' });
      heading?.focus({ preventScroll: true });
    });
  };
  const enterPractice = (id: MilestoneId) => {
    setActive(id);
    setView('practice');
    setAnnouncement(`${id} selected. ${MILESTONES.find((item) => item.id === id)?.prompt}`);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      const activeElement = document.activeElement;
      const focusIsUnclaimed =
        activeElement === null ||
        activeElement === document.body ||
        activeElement === document.documentElement;
      if (focusIsUnclaimed) mainRef.current?.focus({ preventScroll: true });
    });
  };
  const learnFlow = () => {
    setView('guide');
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main')?.focus());
  };
  return (
    <div className={`app-shell ${view === 'guide' ? 'guide-mode' : ''}`}>
      <header className="product-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>Protocol Workbench</strong>
            <span>OAuth 2.0 + OpenID Connect</span>
          </div>
        </div>
        <div className="safety-boundary">
          <span className="status-dot" aria-hidden="true" /> <strong>SYNTHETIC · LOCAL</strong>
          <span>No real credentials or tokens. No network calls.</span>
        </div>
        <div className="header-actions">
          <span className="progress-label">{passedCount}/8 gates</span>
          <button
            className="icon-button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '◐' : '○'}
          </button>
          <button
            ref={resetOpenerRef}
            className="secondary compact"
            onClick={() => setResetOpen(true)}
          >
            Reset all
          </button>
        </div>
      </header>
      {view === 'guide' ? (
        <GuidedLearning onEnterPractice={enterPractice} />
      ) : (
        <>
          <nav className="milestone-rail" aria-label="Learning milestones">
            <div className="rail-heading">
              <span className="eyebrow">LOCAL PROGRESS</span>
              <strong>{passedCount === 8 ? 'Workbench complete' : 'Build the trace'}</strong>
            </div>
            {MILESTONES.map((item, index) => {
              const itemStatus = progress[item.id] ?? 'not started';
              return (
                <button
                  key={item.id}
                  className={active === item.id ? 'current' : ''}
                  aria-current={active === item.id ? 'step' : undefined}
                  onClick={() => selectMilestone(item.id)}
                >
                  <span className="milestone-number">{item.id}</span>
                  <span>
                    <strong>{item.verb}</strong>
                    <small>{item.title}</small>
                  </span>
                  <i
                    className={`gate-dot ${itemStatus.replaceAll(' ', '-')}`}
                    aria-label={itemStatus}
                  >
                    {itemStatus === 'passed' ? '✓' : String(index + 1).padStart(2, '0')}
                  </i>
                </button>
              );
            })}
            <div className="rail-footer">
              <span>All interactions stay in this browser.</span>
              <span>Progress uses localStorage only.</span>
            </div>
          </nav>
          <main id="main" className="workbench" tabIndex={-1} ref={mainRef}>
            <section className="task-header">
              <div>
                <span className="eyebrow">
                  {milestone.id} · {milestone.verb.toUpperCase()}
                </span>
                <h1 ref={taskHeadingRef} tabIndex={-1}>
                  {milestone.title}
                </h1>
                <p>{milestone.prompt}</p>
              </div>
              <div className="task-actions">
                <button className="secondary" onClick={learnFlow}>
                  Learn the flow
                </button>
                <div className={`gate-status ${status.replaceAll(' ', '-')}`}>
                  <span>{status === 'passed' ? '✓' : status === 'needs repair' ? '×' : '→'}</span>
                  <div>
                    <small>GATE STATUS</small>
                    <strong>{status}</strong>
                  </div>
                </div>
              </div>
            </section>
            <section className="bench-surface" aria-label={`${milestone.title} interactive bench`}>
              {active === 'M0' && (
                <TrustMap
                  onResult={(passed) => recordResult('M0', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M1' && (
                <PkceComposer
                  onResult={(passed) => recordResult('M1', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M2' && (
                <ScopeLab
                  onResult={(passed) => recordResult('M2', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M3' && (
                <TokenLab
                  onResult={(passed) => recordResult('M3', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M4' && (
                <IdentityLab
                  onResult={(passed) => recordResult('M4', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M5' && (
                <ThreatArcade
                  onResult={(passed) => recordResult('M5', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M6' && (
                <SchemaBench
                  onResult={(passed) => recordResult('M6', passed)}
                  announce={setAnnouncement}
                />
              )}
              {active === 'M7' && (
                <Capstone
                  onResult={(passed) => recordResult('M7', passed)}
                  announce={setAnnouncement}
                  progress={progress}
                />
              )}
            </section>
            <section id="references" className="references" aria-label="Protocol references">
              <span className="eyebrow">AUTHORITATIVE TARGETS</span>
              <div>
                <a href="https://www.rfc-editor.org/rfc/rfc9700">
                  OAuth 2.0 Security BCP · RFC 9700
                </a>
                <a href="https://www.rfc-editor.org/rfc/rfc6749">OAuth 2.0 · RFC 6749</a>
                <a href="https://www.rfc-editor.org/rfc/rfc7636">PKCE · RFC 7636</a>
                <a href="https://openid.net/specs/openid-connect-core-1_0.html">OIDC Core 1.0</a>
                <a href="https://www.rfc-editor.org/rfc/rfc8414">AS Metadata · RFC 8414</a>
                <a href="https://www.rfc-editor.org/rfc/rfc7519">JWT · RFC 7519</a>
              </div>
              <p>
                External references are optional reading. Every simulation remains local and
                deterministic.
              </p>
            </section>
          </main>
          <Inspector milestone={milestone} status={status} />
          <div className="status-strip" role="status" aria-live="polite">
            <span className="status-pulse" aria-hidden="true" />
            <strong>
              {active} · {status.toUpperCase()}
            </strong>
            <span>{announcement}</span>
            <code>{milestone.trace}</code>
          </div>
          <nav className="mobile-switcher" aria-label="Mobile task switcher">
            <button className="active" onClick={() => mainRef.current?.scrollIntoView()}>
              Build
            </button>
            <button onClick={() => document.querySelector('.inspector')?.scrollIntoView()}>
              Inspect
            </button>
            <button onClick={() => document.querySelector('.evidence')?.scrollIntoView()}>
              Checks
            </button>
            <button onClick={() => document.querySelector('.references')?.scrollIntoView()}>
              Refs
            </button>
          </nav>
        </>
      )}
      {resetOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            ref={resetDialogRef}
          >
            <span className="eyebrow">IRREVERSIBLE LOCAL ACTION</span>
            <h2 id="reset-title">Reset all progress?</h2>
            <p>This clears gate evidence on this device. Recovery is unavailable.</p>
            <label>
              Type <strong>RESET LOCAL</strong>
              <input
                autoFocus
                ref={resetInputRef}
                value={resetPhrase}
                onChange={(event) => setResetPhrase(event.target.value)}
              />
            </label>
            <div>
              <button className="secondary" onClick={closeReset}>
                Cancel
              </button>
              <button
                className="danger"
                disabled={resetPhrase !== 'RESET LOCAL'}
                onClick={() => {
                  setProgress({});
                  closeReset();
                  setAnnouncement('All local progress reset.');
                }}
              >
                Reset local progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
