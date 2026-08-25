const flowSteps = [
  [
    '1',
    'Create transaction',
    'Client creates state, nonce, and a PKCE verifier; stores them before redirecting.',
  ],
  [
    '2',
    'Authorize',
    'Browser opens /authorize with client_id, exact redirect_uri, scope, state, nonce, and S256 challenge.',
  ],
  [
    '3',
    'Sign in + consent',
    'Authorization server authenticates the person and records the grant.',
  ],
  ['4', 'Callback', 'Browser returns one code and state to the registered client callback.'],
  [
    '5',
    'Redeem',
    'Client sends the code, redirect_uri, and PKCE verifier to the token endpoint once.',
  ],
  [
    '6',
    'Validate + use',
    'Client validates the ID token; the resource API validates the access token it receives.',
  ],
] as const;

const validationChecks = [
  [
    'Signature',
    'Verify with a trusted key selected by kid and the expected algorithm. Decoding is not verification.',
  ],
  ['Issuer', 'iss exactly equals the configured or discovered issuer.'],
  ['Audience', 'aud contains this client_id; validate azp when multiple audiences exist.'],
  ['Expiry', 'exp is in the future; also check nbf/iat with a small clock-skew allowance.'],
  ['Nonce', 'nonce equals the one stored for this browser transaction, then discard it.'],
] as const;

const troubleshootingChecks = [
  [
    'redirect_uri_mismatch',
    '/authorize + registration',
    'Exact; loopback port is the sole dynamic exception.',
    'Compare scheme, host, port, path, query, encoding. Stop.',
  ],
  [
    'State mismatch',
    'Callback + transaction',
    'Exact, same transaction, one-use.',
    'Discard it; restart fresh.',
  ],
  [
    'Nonce mismatch',
    'ID token + transaction',
    'Exact, same transaction, one-use.',
    'Reject session; inspect iss/aud.',
  ],
  [
    'Lost login / cookie',
    'Callback cookie + proxy',
    'Callback resumes same server session.',
    'Check SameSite, Secure, domain, path, proxy.',
  ],
  [
    'Issuer / audience',
    'Discovery + ID token claims',
    'iss exact; aud/azp valid for client_id.',
    'Check metadata, JWKS, client config.',
  ],
] as const;

export function CheatSheet() {
  return (
    <section
      id="guide-cheat-sheet"
      className="guide-section cheat-sheet-section"
      aria-labelledby="cheat-sheet-title"
    >
      <header className="cheat-sheet-heading">
        <div>
          <span className="eyebrow">FIELD REFERENCE · ONE PAGE</span>
          <h2 id="cheat-sheet-title">OIDC field cheat sheet</h2>
          <p>
            From first redirect to failed callback: the compact model, checks, and inspection order.
          </p>
        </div>
        <a
          className="cheat-sheet-download"
          href="./oidc-field-cheat-sheet.pdf"
          download="oidc-field-cheat-sheet.pdf"
        >
          <span aria-hidden="true">↓</span>
          Download one-page PDF
        </a>
      </header>

      <div className="cheat-sheet-grid">
        <section
          className="cheat-card cheat-card-definitions"
          aria-labelledby="cheat-definitions-title"
        >
          <div className="cheat-card-title">
            <span>01</span>
            <h3 id="cheat-definitions-title">What each part is</h3>
          </div>
          <p className="cheat-summary">
            <strong>OAuth 2.0</strong> delegates API access. <strong>OpenID Connect</strong> adds
            sign-in identity. The <strong>authorization server</strong> issues results; the{' '}
            <strong>resource server</strong> protects the API.
          </p>
          <dl className="cheat-definitions">
            <div>
              <dt>Person</dt>
              <dd>Approves sign-in or access.</dd>
            </div>
            <div>
              <dt>User agent</dt>
              <dd>Browser carrying redirects.</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>App requesting identity or API access.</dd>
            </div>
            <div>
              <dt>Authorization endpoint</dt>
              <dd>
                Front channel: <code>/authorize</code>
              </dd>
            </div>
            <div>
              <dt>Callback</dt>
              <dd>Client redirect URI receiving code + state.</dd>
            </div>
            <div>
              <dt>Token endpoint</dt>
              <dd>Back channel: code → tokens.</dd>
            </div>
            <div>
              <dt>Access token</dt>
              <dd>For the resource API; audience is the API.</dd>
            </div>
            <div>
              <dt>ID token</dt>
              <dd>For the client; claims describe the sign-in.</dd>
            </div>
            <div>
              <dt>Refresh token</dt>
              <dd>For the client to obtain fresh tokens; rotate and protect it.</dd>
            </div>
          </dl>
        </section>

        <section className="cheat-card cheat-card-flow" aria-labelledby="cheat-flow-title">
          <div className="cheat-card-title">
            <span>02</span>
            <h3 id="cheat-flow-title">Authorization Code + PKCE flow</h3>
          </div>
          <ol className="cheat-flow">
            {flowSteps.map(([number, title, detail]) => (
              <li key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="cheat-native-note">
            <strong>Redirect URI:</strong> register exact values and match exactly. Native
            exceptions use claimed HTTPS, private-use, or loopback redirects; only the loopback port
            may vary.
          </p>
        </section>

        <section
          className="cheat-card cheat-card-validation"
          aria-labelledby="cheat-validation-title"
        >
          <div className="cheat-card-title">
            <span>03</span>
            <h3 id="cheat-validation-title">ID token validation</h3>
          </div>
          <p className="cheat-warning">
            <strong>Decode ≠ trust.</strong> Validate every item before creating a session.
          </p>
          <ul className="cheat-checks">
            {validationChecks.map(([name, detail]) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
          <p className="cheat-state-nonce">
            <strong>State</strong> binds the authorization response to the browser transaction;{' '}
            <strong>nonce</strong> binds the ID token to that transaction. Both must be exact and
            single-use.
          </p>
        </section>

        <section
          className="cheat-card cheat-card-troubleshoot"
          aria-labelledby="cheat-troubleshoot-title"
        >
          <div className="cheat-card-title">
            <span>04</span>
            <h3 id="cheat-troubleshoot-title">Troubleshooting order</h3>
          </div>
          <table
            className="cheat-trouble-table"
            aria-label="Symptom to next-check troubleshooting sequence"
          >
            <thead>
              <tr>
                <th scope="col">Symptom</th>
                <th scope="col">Trace</th>
                <th scope="col">Invariant</th>
                <th scope="col">Next check</th>
              </tr>
            </thead>
            <tbody>
              {troubleshootingChecks.map(([symptom, trace, invariant, nextCheck]) => (
                <tr key={symptom}>
                  <td data-label="Symptom">{symptom}</td>
                  <td data-label="Trace">{trace}</td>
                  <td data-label="Invariant">{invariant}</td>
                  <td data-label="Next check">{nextCheck}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cheat-stop">
            <strong>Stop at the first broken invariant.</strong> Fix it, restart with a fresh
            transaction, then continue down the list.
          </p>
        </section>
      </div>
      <footer className="cheat-sheet-footer">
        Protocol Workbench · OAuth 2.0 + OpenID Connect · synthetic examples only
      </footer>
    </section>
  );
}
