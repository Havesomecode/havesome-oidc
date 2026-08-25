export type CheckResult = {
  id: string;
  label: string;
  expected: string;
  observed: string;
  passed: boolean;
  trace: string;
};

export type PkceConfig = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  challengeMethod: string;
  verifier: string;
  codeChallenge: string;
  codeUsed: boolean;
  codeExpired: boolean;
};

const result = (
  id: string,
  label: string,
  expected: string,
  observed: string,
  passed: boolean,
  trace = 'trace_local_001',
): CheckResult => ({ id, label, expected, observed, passed, trace });

export async function deriveS256CodeChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const encoded = globalThis.btoa(String.fromCharCode(...new Uint8Array(digest)));
  return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function checkPkceFlow(config: PkceConfig): Promise<CheckResult[]> {
  const verifierValid = /^[A-Za-z0-9._~-]{43,128}$/.test(config.verifier);
  const derivedChallenge = verifierValid
    ? await deriveS256CodeChallenge(config.verifier)
    : '(invalid verifier)';
  return [
    result(
      'response-type',
      'Authorization response',
      'response_type=code',
      config.responseType,
      config.responseType === 'code',
    ),
    result(
      'client-binding',
      'Client binding',
      'client_notes_web',
      config.clientId,
      config.clientId === 'client_notes_web',
    ),
    result(
      'redirect-match',
      'Exact redirect URI',
      'https://client.local/callback',
      config.redirectUri,
      config.redirectUri === 'https://client.local/callback',
    ),
    result(
      'scope-openid',
      'OIDC scope',
      'contains openid',
      config.scope,
      config.scope.split(/\s+/).includes('openid'),
    ),
    result(
      'state',
      'CSRF correlation',
      'non-empty, local state',
      config.state || '(missing)',
      /^state_local_[A-Za-z0-9]+$/.test(config.state),
    ),
    result(
      'pkce-method',
      'PKCE method',
      'S256',
      config.challengeMethod,
      config.challengeMethod === 'S256',
    ),
    result(
      'pkce-verifier',
      'PKCE verifier',
      '43–128 unreserved characters',
      `${config.verifier.length} characters`,
      verifierValid,
    ),
    result(
      'pkce-challenge',
      'PKCE S256 binding',
      'BASE64URL(SHA256(code_verifier))',
      config.codeChallenge,
      verifierValid && config.codeChallenge === derivedChallenge,
    ),
    result(
      'single-use',
      'Code lifecycle',
      'unused',
      config.codeUsed ? 'already used' : 'unused',
      !config.codeUsed,
    ),
    result(
      'unexpired',
      'Code lifetime',
      'not expired',
      config.codeExpired ? 'expired' : 'active',
      !config.codeExpired,
    ),
  ];
}

export type ScopeConfig = {
  requested: string[];
  granted: string[];
  denied: string[];
  resource: string;
  audience: string;
};

export function checkScopeSelection(config: ScopeConfig): CheckResult[] {
  const grantedSet = new Set(config.granted);
  const requestedSet = new Set(config.requested);
  const deniedSet = new Set(config.denied);
  const excessive = config.granted.filter(
    (scope) => !requestedSet.has(scope) || scope === 'notes.write',
  );
  return [
    result(
      'grant-subset',
      'Consent grant',
      'granted ⊆ requested',
      config.granted.join(' ') || '(none)',
      config.granted.every((scope) => requestedSet.has(scope)),
      'trace_local_008',
    ),
    result(
      'denied-absent',
      'Denied permission',
      'denied scopes absent',
      config.denied.filter((scope) => grantedSet.has(scope)).join(' ') || 'none granted',
      config.denied.every((scope) => !grantedSet.has(scope)),
      'trace_local_009',
    ),
    result(
      'resource-audience',
      'API audience',
      'api://notes',
      `${config.resource} → ${config.audience}`,
      config.resource === 'api://notes' && config.audience === 'api://notes',
      'trace_local_010',
    ),
    result(
      'least-privilege',
      'Least privilege',
      'openid + notes.read only',
      excessive.length ? `unnecessary: ${excessive.join(', ')}` : config.granted.join(' '),
      grantedSet.has('openid') &&
        grantedSet.has('notes.read') &&
        excessive.length === 0 &&
        !deniedSet.has('notes.read'),
      'trace_local_011',
    ),
  ];
}

const toBase64Url = (value: string) => {
  const encoded = globalThis.btoa(unescape(encodeURIComponent(value)));
  return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return decodeURIComponent(escape(globalThis.atob(padded)));
};

export type SyntheticClaims = {
  iss: string;
  aud: string;
  sub: string;
  nonce?: string;
  exp: number;
  azp?: string;
  at_hash?: string;
  scope?: string;
  token_use?: 'id' | 'access';
};

export function encodeSyntheticJwt(payload: SyntheticClaims): string {
  const header = { alg: 'none', typ: 'SYNTHETIC+JWT', kid: 'local_demo_key' };
  return `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.${toBase64Url('LOCAL_ONLY_NOT_A_SIGNATURE')}`;
}

export function decodeSyntheticJwt(token: string): {
  header: Record<string, unknown>;
  payload: SyntheticClaims;
  signature: string;
  signatureVerified: false;
} {
  try {
    const [headerPart, payloadPart, signaturePart, extra] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart || extra) throw new Error('segments');
    const header = JSON.parse(fromBase64Url(headerPart)) as Record<string, unknown>;
    const payload = JSON.parse(fromBase64Url(payloadPart)) as SyntheticClaims;
    const signature = fromBase64Url(signaturePart);
    if (header.typ !== 'SYNTHETIC+JWT' || signature !== 'LOCAL_ONLY_NOT_A_SIGNATURE') {
      throw new Error('fixture marker');
    }
    return { header, payload, signature, signatureVerified: false };
  } catch {
    throw new Error('Only a synthetic local token fixture can be decoded here.');
  }
}

export const DISCOVERY_FIXTURE = {
  issuer: 'https://op.local',
  authorization_endpoint: 'https://op.local/authorize',
  token_endpoint: 'https://op.local/token',
  userinfo_endpoint: 'https://op.local/userinfo',
  jwks_uri: 'https://op.local/jwks',
};

export function validateDiscovery(metadata: typeof DISCOVERY_FIXTURE): CheckResult[] {
  const expected = DISCOVERY_FIXTURE;
  return (Object.keys(expected) as Array<keyof typeof expected>).map((key, index) =>
    result(
      `metadata-${key}`,
      key.replaceAll('_', ' '),
      expected[key],
      metadata[key] || '(missing)',
      metadata[key] === expected[key] && metadata[key].startsWith('https://'),
      `trace_local_02${index}`,
    ),
  );
}

export type Threat = {
  id: string;
  glyph: string;
  name: string;
  object: string;
  boundary: string;
  unsafe: string;
  consequence: string;
  repair: string;
  invariant: string;
};

export const THREATS: Threat[] = [
  {
    id: 'state',
    glyph: '⨯∞',
    name: 'CSRF / state',
    object: 'authorization response',
    boundary: 'browser ↔ client',
    unsafe: 'State is missing',
    consequence: 'An attacker can bind their authorization response to another browser session.',
    repair: 'Match a session-bound state once',
    invariant: 'state is unpredictable, session-bound, and consumed once',
  },
  {
    id: 'pkce',
    glyph: '↠⌁',
    name: 'Code interception / PKCE',
    object: 'code_demo_7K2',
    boundary: 'front ↔ back channel',
    unsafe: 'Plain challenge',
    consequence: 'An intercepted code can be redeemed without the original verifier.',
    repair: 'Require S256 challenge',
    invariant: 'S256 binds code redemption to the original verifier',
  },
  {
    id: 'redirect',
    glyph: '↪□',
    name: 'Redirect URI manipulation',
    object: 'redirect_uri',
    boundary: 'client allowlist',
    unsafe: 'Prefix match',
    consequence: 'The code can be redirected to an attacker-controlled path.',
    repair: 'Use exact registered URI',
    invariant: 'redirect URI exactly equals the pre-registered value',
  },
  {
    id: 'issuer',
    glyph: '◇⨯◇',
    name: 'Mix-up / issuer confusion',
    object: 'authorization response',
    boundary: 'client ↔ OP',
    unsafe: 'Issuer not checked',
    consequence: 'A response from another authorization server enters this trace.',
    repair: 'Bind expected issuer',
    invariant: 'response issuer equals https://op.local',
  },
  {
    id: 'audience',
    glyph: 'AT⇄ID',
    name: 'Token substitution / audience',
    object: 'access token',
    boundary: 'client ↔ API',
    unsafe: 'Audience ignored',
    consequence: 'A token minted for another consumer is accepted by the notes API.',
    repair: 'Check token type + aud',
    invariant: 'token purpose and audience match the consuming component',
  },
  {
    id: 'nonce',
    glyph: 'N↻',
    name: 'Nonce replay',
    object: 'id_demo_I42',
    boundary: 'OP ↔ client session',
    unsafe: 'Nonce reused',
    consequence: 'An old ID token can be replayed into a new login session.',
    repair: 'Match and consume nonce',
    invariant: 'nonce is request-bound, matched, and consumed once',
  },
  {
    id: 'leak',
    glyph: 'AT⋯',
    name: 'Access-token leakage',
    object: 'at_demo_A17',
    boundary: 'browser history / logs',
    unsafe: 'Token in URL',
    consequence: 'The bearer token leaks through history, referrers, or logs.',
    repair: 'Use Authorization header',
    invariant: 'access token is sent only in the API Authorization header',
  },
  {
    id: 'refresh',
    glyph: 'RT↻RT',
    name: 'Refresh-token replay',
    object: 'rt_demo_R09 family',
    boundary: 'client ↔ token endpoint',
    unsafe: 'Static refresh token',
    consequence: 'A stolen refresh token remains reusable after legitimate rotation.',
    repair: 'Rotate and revoke family',
    invariant: 'reuse detection invalidates the refresh-token family',
  },
  {
    id: 'storage',
    glyph: '▣⚠',
    name: 'Unsafe browser storage',
    object: 'bearer token',
    boundary: 'script-readable storage',
    unsafe: 'Stored in localStorage',
    consequence: 'Injected script can read and exfiltrate the bearer token.',
    repair: 'Keep token out of durable JS storage',
    invariant: 'bearer tokens avoid durable script-readable browser storage',
  },
];

export type CapstoneFault = {
  id: string;
  phase: string;
  threat: string;
  expected: string;
  observed: string;
};

export const CAPSTONE_FAULTS: CapstoneFault[] = [
  {
    id: 'redirect',
    phase: 'Authorize',
    threat: 'Redirect manipulation',
    expected: 'exact https://client.local/callback',
    observed: 'prefix match enabled',
  },
  {
    id: 'pkce',
    phase: 'Redeem',
    threat: 'Code interception',
    expected: 'S256 + 43-character verifier',
    observed: 'plain challenge',
  },
  {
    id: 'nonce',
    phase: 'Consume ID token',
    threat: 'Nonce replay',
    expected: 'nonce_local_N42 once',
    observed: 'nonce not consumed',
  },
  {
    id: 'audience',
    phase: 'Call API',
    threat: 'Audience confusion',
    expected: 'aud api://notes',
    observed: 'aud api://profile',
  },
  {
    id: 'subject',
    phase: 'Reconcile UserInfo',
    threat: 'Subject substitution',
    expected: 'sub user_ada',
    observed: 'sub user_grace',
  },
];

export const CAPSTONE_SCENARIOS: Record<string, CapstoneFault[]> = {
  'FORGE-7K2-05': CAPSTONE_FAULTS,
  'FORGE-I42-05': [
    {
      id: 'redirect',
      phase: 'Authorize',
      threat: 'Redirect manipulation',
      expected: 'exact https://client.local/callback',
      observed: 'encoded path segment accepted',
    },
    {
      id: 'pkce',
      phase: 'Redeem',
      threat: 'Code interception',
      expected: 'derived S256 challenge matches verifier',
      observed: 'challenge copied from another transaction',
    },
    {
      id: 'nonce',
      phase: 'Consume ID token',
      threat: 'Nonce replay',
      expected: 'nonce_local_I42 once',
      observed: 'nonce_local_I42 reused after restart',
    },
    {
      id: 'audience',
      phase: 'Call API',
      threat: 'Audience confusion',
      expected: 'aud api://notes',
      observed: 'aud client_notes_web',
    },
    {
      id: 'subject',
      phase: 'Reconcile UserInfo',
      threat: 'Subject substitution',
      expected: 'sub pair_ada_notes',
      observed: 'sub pair_ada_profile',
    },
  ],
};

export function checkCapstone(
  repairs: Record<string, boolean>,
  faults: CapstoneFault[] = CAPSTONE_FAULTS,
): CheckResult[] {
  return faults.map((fault, index) =>
    result(
      fault.id,
      `${fault.phase}: ${fault.threat}`,
      fault.expected,
      repairs[fault.id] ? fault.expected : fault.observed,
      Boolean(repairs[fault.id]),
      `trace_local_10${index}`,
    ),
  );
}
