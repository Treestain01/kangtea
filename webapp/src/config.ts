import { DEFAULT_SCHEDULE, type ProgressSchedule } from './store/orderProgress';

/** The only place that reads import.meta.env. */
type Env = Record<string, string | undefined>;

/** Base URL of the api project. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Stripe publishable key. Read at call time so tests can stub the env.
 * Empty means payments are off and placing an order behaves as before payments existed.
 */
export function stripePublishableKey(): string {
  return (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
}

function seconds(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * How fast the simulated kitchen moves an order along, in seconds after it was placed.
 * `VITE_KITCHEN_MAKING_SECONDS` and `VITE_KITCHEN_READY_SECONDS` override the defaults (20 and 60);
 * set them low in `webapp/.env.local` to test the order flow without waiting.
 * Ready never comes before making.
 */
export function kitchenSchedule(env: Env): ProgressSchedule {
  const making = seconds(env.VITE_KITCHEN_MAKING_SECONDS, DEFAULT_SCHEDULE.makingAfterMs / 1000);
  const ready = seconds(env.VITE_KITCHEN_READY_SECONDS, DEFAULT_SCHEDULE.readyAfterMs / 1000);
  return { makingAfterMs: making * 1000, readyAfterMs: Math.max(making, ready) * 1000 };
}

export const KITCHEN_SCHEDULE: ProgressSchedule = kitchenSchedule(import.meta.env as Env);
