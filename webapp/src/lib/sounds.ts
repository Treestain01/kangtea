/**
 * The app's few sounds, all synthesised so nothing is downloaded: a plop when a piece drops, a
 * click when a lid goes on, a short pour. Off unless the person turns sounds on in Account.
 * Browsers only let audio start from a gesture, so the context is created on the first cue after
 * a tap, and every cue is silent where there is no audio at all (tests, some webviews).
 */

export type SoundCue = 'drop' | 'lid' | 'pour' | 'pearl';

type Note = { from: number; to: number; seconds: number; gain: number; type: OscillatorType };

const NOTES: Record<SoundCue, Note> = {
  drop: { from: 520, to: 240, seconds: 0.12, gain: 0.16, type: 'sine' },
  pearl: { from: 640, to: 300, seconds: 0.1, gain: 0.14, type: 'sine' },
  lid: { from: 900, to: 500, seconds: 0.06, gain: 0.1, type: 'triangle' },
  pour: { from: 300, to: 180, seconds: 0.3, gain: 0.08, type: 'sine' },
};

let enabled = false;
let context: AudioContext | null = null;

export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

export function soundsEnabled(): boolean {
  return enabled;
}

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor =
    typeof window !== 'undefined'
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Plays a cue if sounds are on. Never throws. */
export function cue(name: SoundCue): void {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    const note = NOTES[name];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.from, now);
    osc.frequency.exponentialRampToValueAtTime(note.to, now + note.seconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(note.gain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + note.seconds);
  } catch {
    // A cue that cannot play is simply skipped.
  }
}
