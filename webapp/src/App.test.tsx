import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./api/client', () => ({
  fetchStore: vi.fn().mockReturnValue(new Promise<never>(() => {})),
  fetchMenu: vi.fn().mockReturnValue(new Promise<never>(() => {})),
}));

describe('App', () => {
  it('renders the Kang Tea heading, logo and the home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the menu');
  });

  it('does not show the iOS shell note in a browser', () => {
    render(<App />);
    expect(screen.queryByText(/inside the Kang Tea iOS app/)).not.toBeInTheDocument();
  });
});
