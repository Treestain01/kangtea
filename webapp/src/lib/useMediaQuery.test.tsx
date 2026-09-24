import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_QUERY, useMediaQuery } from './useMediaQuery';

function Probe() {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  return <p>{desktop ? 'desktop' : 'phone'}</p>;
}

type Listener = () => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const list = {
    matches: initialMatches,
    media: DESKTOP_QUERY,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  };
  window.matchMedia = vi.fn().mockReturnValue(list) as unknown as typeof window.matchMedia;
  return {
    setMatches(matches: boolean) {
      list.matches = matches;
      listeners.forEach((listener) => listener());
    },
    listeners,
  };
}

describe('useMediaQuery', () => {
  const original = window.matchMedia;

  afterEach(() => {
    window.matchMedia = original;
  });

  it('is false when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    render(<Probe />);
    expect(screen.getByText('phone')).toBeInTheDocument();
  });

  it('reflects the current match and updates on change', () => {
    const media = installMatchMedia(false);
    render(<Probe />);
    expect(screen.getByText('phone')).toBeInTheDocument();
    act(() => media.setMatches(true));
    expect(screen.getByText('desktop')).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const media = installMatchMedia(true);
    const { unmount } = render(<Probe />);
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
