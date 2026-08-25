import {
  CAPSTONE_FAULTS,
  THREATS,
  checkCapstone,
  checkPkceFlow,
  checkScopeSelection,
  decodeSyntheticJwt,
  encodeSyntheticJwt,
  validateDiscovery,
} from '../src/protocol';

describe('protocol simulations', () => {
  it('accepts a complete Authorization Code plus S256 PKCE trace and rejects replay', () => {
    expect(
      checkPkceFlow({
        responseType: 'code',
        clientId: 'client_notes_web',
        redirectUri: 'https://client.local/callback',
        scope: 'openid notes.read',
        state: 'state_local_9X4',
        challengeMethod: 'S256',
        verifier: 'verifier_local_43_characters_demo_only_7K2X',
        codeUsed: false,
        codeExpired: false,
      }).every((check) => check.passed),
    ).toBe(true);

    expect(
      checkPkceFlow({
        responseType: 'code',
        clientId: 'client_notes_web',
        redirectUri: 'https://client.local/callback',
        scope: 'openid notes.read',
        state: 'state_local_9X4',
        challengeMethod: 'S256',
        verifier: 'verifier_local_43_characters_demo_only_7K2X',
        codeUsed: true,
        codeExpired: false,
      }).find((check) => check.id === 'single-use')?.passed,
    ).toBe(false);
  });

  it('requires least privilege, requested grants, and the intended audience', () => {
    expect(
      checkScopeSelection({
        requested: ['openid', 'notes.read'],
        granted: ['openid', 'notes.read'],
        denied: ['notes.write'],
        resource: 'api://notes',
        audience: 'api://notes',
      }).every((check) => check.passed),
    ).toBe(true);

    expect(
      checkScopeSelection({
        requested: ['openid', 'notes.read'],
        granted: ['openid', 'notes.read', 'notes.write'],
        denied: [],
        resource: 'api://notes',
        audience: 'api://notes',
      }).find((check) => check.id === 'least-privilege')?.passed,
    ).toBe(false);
  });

  it('decodes only synthetic JWT fixtures and keeps verification false', () => {
    const token = encodeSyntheticJwt({
      iss: 'https://op.local',
      aud: 'client_notes_web',
      sub: 'user_ada',
      nonce: 'nonce_local_N42',
      exp: 4102444800,
      azp: 'client_notes_web',
      at_hash: 'hash_demo_A17',
    });
    const decoded = decodeSyntheticJwt(token);
    expect(decoded.payload.sub).toBe('user_ada');
    expect(decoded.signatureVerified).toBe(false);
    expect(() => decodeSyntheticJwt('real-looking.invalid.input')).toThrow(
      /synthetic local token/i,
    );
  });

  it('checks local discovery metadata without fetching a remote issuer', () => {
    expect(
      validateDiscovery({
        issuer: 'https://op.local',
        authorization_endpoint: 'https://op.local/authorize',
        token_endpoint: 'https://op.local/token',
        userinfo_endpoint: 'https://op.local/userinfo',
        jwks_uri: 'https://op.local/jwks',
      }).every((check) => check.passed),
    ).toBe(true);
  });

  it('contains nine distinct threats and five deterministic capstone faults', () => {
    expect(THREATS).toHaveLength(9);
    expect(new Set(THREATS.map((threat) => threat.id)).size).toBe(9);
    expect(CAPSTONE_FAULTS).toHaveLength(5);
    expect(
      checkCapstone(Object.fromEntries(CAPSTONE_FAULTS.map((fault) => [fault.id, true]))),
    ).toHaveLength(5);
  });
});
