import { render, screen } from '@testing-library/react';
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
});
