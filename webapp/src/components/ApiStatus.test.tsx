import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from '../api/client';
import { ApiStatus } from './ApiStatus';

vi.mock('../api/client', () => ({ fetchHealth: vi.fn() }));

const mockedFetchHealth = vi.mocked(fetchHealth);

describe('ApiStatus', () => {
  beforeEach(() => {
    mockedFetchHealth.mockReset();
  });

  it('shows a checking state first', () => {
    mockedFetchHealth.mockReturnValue(new Promise<never>(() => {}));
    render(<ApiStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('API: checking');
  });

  it('shows ok with the timestamp when the API responds', async () => {
    mockedFetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'bbt-api',
      timestamp: '2026-09-23T10:00:00.000Z',
    });
    render(<ApiStatus />);
    expect(await screen.findByText(/API: ok/)).toHaveTextContent('2026-09-23T10:00:00.000Z');
  });

  it('shows an alert when the API is unreachable', async () => {
    mockedFetchHealth.mockRejectedValue(new Error('boom'));
    render(<ApiStatus />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API: unreachable (boom)');
  });
});
