import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./api/client', () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    service: 'bbt-api',
    timestamp: '2026-09-23T10:00:00.000Z',
  }),
}));

describe('App', () => {
  it('renders the heading and the API status', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BBT' })).toBeInTheDocument();
    expect(await screen.findByText(/API: ok/)).toBeInTheDocument();
  });

  it('does not show the iOS shell note in a browser', () => {
    render(<App />);
    expect(screen.queryByText(/inside the BBT iOS app/)).not.toBeInTheDocument();
  });
});
