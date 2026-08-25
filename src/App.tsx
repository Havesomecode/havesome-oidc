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
    Object.fromEntries(ACTORS.map((actor) => [actor.id, actor.expected])),
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
    } else announce('Map needs repair. The incorrect actor remains selected.');
  };
  return (
    <div className="module" id="trace_local_001">
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
              <span>{actor.name}</span>
            </button>
          ))}
        </div>
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
    if (!progress[active]) mark(active, 'in progress');
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
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
      taskHeadingRef.current?.focus();
    });
  };
  return (
    <div className="app-shell">
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
              <i className={`gate-dot ${itemStatus.replaceAll(' ', '-')}`} aria-label={itemStatus}>
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
          <div className={`gate-status ${status.replaceAll(' ', '-')}`}>
            <span>{status === 'passed' ? '✓' : status === 'needs repair' ? '×' : '→'}</span>
            <div>
              <small>GATE STATUS</small>
              <strong>{status}</strong>
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
            <a href="https://www.rfc-editor.org/rfc/rfc9700">OAuth 2.0 Security BCP · RFC 9700</a>
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
