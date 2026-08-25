import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

describe('Protocol Workbench', () => {
  beforeEach(() => localStorage.clear());

  it('shows the local-only and decode-only safety boundaries', () => {
    render(<App />);
    expect(screen.getByText(/synthetic · local/i)).toBeVisible();
    expect(screen.getByText(/no real credentials or tokens/i)).toBeVisible();
  });

  it('offers all eight hands-on milestones and nine threat challenges', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole('button', { name: /^M[0-7]/ })).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: /^M5/ }));
    expect(screen.getAllByRole('button', { name: /challenge/i })).toHaveLength(9);
  });

  it('reorders PKCE messages without dragging', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^M1/ }));
    expect(screen.getAllByTestId('sequence-message')[0]).toHaveTextContent('GET /authorize');
    await user.click(screen.getAllByRole('button', { name: /move .* down/i })[0]);
    expect(screen.getAllByTestId('sequence-message')[1]).toHaveTextContent('GET /authorize');
  });

  it('persists passed milestone progress locally', async () => {
    const user = userEvent.setup();
    render(<App />);
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
    await user.click(screen.getByRole('button', { name: /^M7/ }));
    expect(screen.getByText('prefix match enabled')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'New deterministic seed' }));
    expect(screen.queryByText('prefix match enabled')).not.toBeInTheDocument();
    expect(screen.getByText('encoded path segment accepted')).toBeVisible();
  });
});
