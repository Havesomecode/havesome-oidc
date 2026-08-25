import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

describe('Protocol Workbench', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a guided mental model and an obvious next action', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /understand oidc before you wire it/i, level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: /oauth grants access/i })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /watch the browser carry the flow/i }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: /redirect uri lens/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /troubleshoot from the trace/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /enter practice lab/i })).toBeVisible();
  });

  it('switches scenario workflows and exposes learner-controlled steps', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: /native app/i }));
    expect(screen.getAllByText(/external browser/i)).toHaveLength(2);
    expect(
      screen.getAllByText('https://app.example.com/oauth/callback', { exact: true }),
    ).toHaveLength(3);
    expect(screen.getByText(/claimed https app link · private-use and loopback/i)).toBeVisible();

    const status = screen.getByRole('status', { name: /workflow step/i });
    expect(status).toHaveTextContent(/step 1/i);
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(status).toHaveTextContent(/step 2/i);
    await user.click(screen.getByRole('button', { name: /restart flow/i }));
    expect(status).toHaveTextContent(/step 1/i);
  });

  it('renders an actor graph and identifies every redirect URI mismatch dimension', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('group', { name: /server web app actor graph/i })).toBeVisible();
    expect(screen.getByText(/active message · web server → browser/i)).toBeVisible();

    for (const [caseName, dimension] of [
      ['Scheme mismatch', 'scheme'],
      ['Host mismatch', 'host'],
      ['Port mismatch', 'port'],
      ['Path mismatch', 'path'],
      ['Query mismatch', 'query'],
      ['Encoding mismatch', 'encoding'],
    ]) {
      await user.click(screen.getByRole('button', { name: caseName }));
      await user.click(screen.getByRole('button', { name: /diagnose redirect/i }));
      const result = screen.getByRole('status', { name: /redirect diagnosis/i });
      expect(result).toHaveTextContent(/redirect_uri_mismatch/i);
      expect(result).toHaveTextContent(new RegExp(dimension, 'i'));
      expect(result).toHaveTextContent(/do not redirect/i);
    }
  });

  it('diagnoses redirect URI and callback failures with a next inspection step', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /path mismatch/i }));
    await user.click(screen.getByRole('button', { name: /diagnose redirect/i }));
    expect(screen.getByRole('status', { name: /redirect diagnosis/i })).toHaveTextContent(
      /redirect_uri_mismatch/i,
    );
    expect(screen.getByRole('status', { name: /redirect diagnosis/i })).toHaveTextContent(/path/i);
    expect(screen.getByRole('status', { name: /redirect diagnosis/i })).toHaveTextContent(
      /do not redirect/i,
    );
  });

  it('enters a readable, unsolved first exercise and can jump to PKCE practice', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    expect(screen.getByRole('heading', { name: 'Cast + trust map', level: 1 })).toBeVisible();
    expect(screen.getByText(/1\. select an actor/i)).toBeVisible();
    expect(screen.getByText(/2\. choose its zone/i)).toBeVisible();
    expect(screen.getByText(/3\. check the map/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /check map/i }));
    expect(screen.getByText('M0 · NEEDS REPAIR')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /learn the flow/i }));
    await user.click(screen.getByRole('button', { name: /jump to pkce practice/i }));
    expect(
      screen.getByRole('heading', { name: 'Authorization Code + PKCE', level: 1 }),
    ).toBeVisible();
  });

  it('shows the local-only and decode-only safety boundaries', () => {
    render(<App />);
    expect(screen.getByText(/synthetic · local/i)).toBeVisible();
    expect(screen.getByText(/no real credentials or tokens/i)).toBeVisible();
  });

  it('offers all eight hands-on milestones and nine threat challenges', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    expect(screen.getAllByRole('button', { name: /^M[0-7]/ })).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: /^M5/ }));
    expect(screen.getAllByRole('button', { name: /challenge/i })).toHaveLength(9);
  });

  it('reorders PKCE messages without dragging', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.click(screen.getByRole('button', { name: /^M1/ }));
    expect(screen.getAllByTestId('sequence-message')[0]).toHaveTextContent('GET /authorize');
    await user.click(screen.getAllByRole('button', { name: /move .* down/i })[0]);
    expect(screen.getAllByTestId('sequence-message')[1]).toHaveTextContent('GET /authorize');
  });

  it('persists passed milestone progress locally', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.selectOptions(screen.getByLabelText(/move client to zone/i), 'Trusted application');
    await user.click(screen.getByRole('button', { name: /check map/i }));
    expect(JSON.parse(localStorage.getItem('protocol-workbench-progress') ?? '{}').M0).toBe(
      'passed',
    );
  });

  it('regresses a failed gate and every passed downstream gate to needs repair', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'protocol-workbench-progress',
      JSON.stringify(
        Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`M${index}`, 'passed'])),
      ),
    );
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));

    await user.click(screen.getByRole('button', { name: /^M1/ }));
    await user.clear(screen.getByLabelText('code_verifier'));
    await user.type(screen.getByLabelText('code_verifier'), 'too-short');
    await user.click(screen.getByRole('button', { name: 'Run checks' }));

    await waitFor(() => {
      const progress = JSON.parse(
        localStorage.getItem('protocol-workbench-progress') ?? '{}',
      ) as Record<string, string>;
      expect(progress.M0).toBe('passed');
      for (let index = 1; index < 8; index += 1) {
        expect(progress[`M${index}`]).toBe('needs repair');
      }
    });
    expect(screen.getByText('1/8 gates')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^M7/ }));
    for (const repair of screen.getAllByRole('checkbox')) await user.click(repair);
    await user.click(screen.getByRole('button', { name: 'Run all checks' }));
    expect(screen.getByText('M7 · NEEDS REPAIR')).toBeVisible();
    expect(screen.getByText(/Prerequisites missing/)).toBeVisible();
  });

  it('rejects M6 JSON values hidden under the wrong field names', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.click(screen.getByRole('button', { name: /^M6/ }));
    await user.click(screen.getByRole('tab', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText(/JSON editor/), {
      target: {
        value: JSON.stringify({
          decoyIssuer: 'https://op.local',
          decoyAudience: 'api://notes',
          decoySubject: 'user_ada',
        }),
      },
    });
    await user.click(screen.getByRole('button', { name: 'Run checks' }));

    expect(screen.getByText('M6 · NEEDS REPAIR')).toBeVisible();
    expect(screen.getByText(/schema field mismatch/)).toBeVisible();
  });

  it('undoes M6 HTTP and JSON edits as coherent combined snapshots', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.click(screen.getByRole('button', { name: /^M6/ }));
    fireEvent.change(screen.getByLabelText(/HTTP editor/), { target: { value: 'HTTP CHANGED' } });
    await user.click(screen.getByRole('tab', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText(/JSON editor/), {
      target: { value: '{"issuer":"changed"}' },
    });

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect((screen.getByLabelText(/JSON editor/) as HTMLTextAreaElement).value).toContain(
      '"subject"',
    );
    await user.click(screen.getByRole('tab', { name: 'HTTP' }));
    expect(screen.getByLabelText(/HTTP editor/)).toHaveValue('HTTP CHANGED');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect((screen.getByLabelText(/HTTP editor/) as HTMLTextAreaElement).value).toContain(
      'POST /token',
    );
  });

  it('uses the selected subject type for the deterministic identity scenario', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.click(screen.getByRole('button', { name: /^M4/ }));
    await user.selectOptions(screen.getByLabelText('Subject type'), 'pairwise');

    expect(screen.getByLabelText('UserInfo sub')).toHaveValue('pair_ada_notes');
    await user.click(screen.getByRole('button', { name: 'Load local metadata' }));
    await user.click(screen.getByRole('button', { name: 'Start local session' }));
    await user.click(screen.getByRole('button', { name: 'Run checks' }));
    expect(screen.getByText('M4 · PASSED')).toBeVisible();
    expect(screen.getAllByText(/start · pair_ada_notes/i)).toHaveLength(2);
  });

  it('changes deterministic capstone scenario data when the seed changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /enter practice lab/i }));
    await user.click(screen.getByRole('button', { name: /^M7/ }));
    expect(screen.getByText('prefix match enabled')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'New deterministic seed' }));
    expect(screen.queryByText('prefix match enabled')).not.toBeInTheDocument();
    expect(screen.getByText('encoded path segment accepted')).toBeVisible();
  });
});
