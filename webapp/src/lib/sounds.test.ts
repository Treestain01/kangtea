import { afterEach, describe, expect, it, vi } from 'vitest';
import { cue, setSoundsEnabled, soundsEnabled } from './sounds';

describe('sounds', () => {
  afterEach(() => {
    setSoundsEnabled(false);
    vi.unstubAllGlobals();
  });

  it('is off until turned on', () => {
    expect(soundsEnabled()).toBe(false);
    setSoundsEnabled(true);
    expect(soundsEnabled()).toBe(true);
  });

  it('stays silent and does not throw where there is no audio', () => {
    setSoundsEnabled(true);
    expect(() => cue('drop')).not.toThrow();
  });

  it('plays a cue through the audio context when on, and nothing when off', () => {
    const start = vi.fn();
    const stop = vi.fn();
    const gainNode = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    gainNode.connect.mockReturnValue(gainNode);
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(() => gainNode),
      start,
      stop,
    };
    const Ctor = vi.fn(function (this: Record<string, unknown>) {
      this.currentTime = 0;
      this.destination = {};
      this.createOscillator = () => osc;
      this.createGain = () => gainNode;
    });
    vi.stubGlobal('AudioContext', Ctor);
    cue('lid');
    expect(start).not.toHaveBeenCalled();
    setSoundsEnabled(true);
    cue('lid');
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(osc.type).toBe('triangle');
  });
});
