import type { Store } from '@bbt/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppHeader, greetingFor } from './AppHeader';

const hours = { open: '11:30', close: '20:00' };
const store: Store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  timezone: 'Australia/Brisbane',
  hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours },
};

// Noon in Brisbane on Thursday 2026-09-24.
const noonBrisbane = new Date('2026-09-24T12:00:00+10:00');

describe('greetingFor', () => {
  it('changes with the hour', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(13)).toBe('Good afternoon');
    expect(greetingFor(19)).toBe('Good evening');
  });
});

describe('AppHeader', () => {
  it('shows the brand, greeting and pickup store with opening status', () => {
    render(<AppHeader store={store} now={noonBrisbane} />);
    expect(screen.getByRole('img', { name: 'Kang Tea' })).toBeInTheDocument();
    // The greeting is split so its second word can be set in italic.
    const greeting = greetingFor(noonBrisbane.getHours());
    expect(
      screen.getByText((_, node) => node?.tagName === 'P' && node.textContent === greeting),
    ).toBeInTheDocument();
    expect(screen.getByText('Calamvale Central')).toBeInTheDocument();
    expect(screen.getByText(/Open until 8:00 pm/)).toBeInTheDocument();
  });

  it('shows a loading line while the store is unknown', () => {
    render(<AppHeader store={null} now={noonBrisbane} />);
    expect(screen.getByText('Finding your store')).toBeInTheDocument();
    expect(screen.queryByText(/Pick up at/)).not.toBeInTheDocument();
  });

  it('renders the actions slot beside the greeting', () => {
    render(<AppHeader store={store} now={noonBrisbane} actions={<button>Do it</button>} />);
    expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
  });
});
