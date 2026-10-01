import type { Order } from '@bbt/shared';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The Monday 00:00 UTC that starts the week holding `time`, as a week number since the epoch. */
function weekOf(time: number): number {
  // 1970-01-01 was a Thursday; shift so weeks start on Monday.
  return Math.floor((time + 3 * 24 * 60 * 60 * 1000) / WEEK_MS);
}

/**
 * How many weeks in a row, up to this week or last, have had a drink collected. A streak that
 * reaches last week still counts, so a person has until Sunday to keep it going. Zero with no history.
 */
export function weeklyStreak(orders: readonly Order[], now: Date = new Date()): number {
  const weeks = new Set(
    orders
      .filter((order) => order.status === 'collected')
      .map((order) => weekOf(Date.parse(order.placedAt))),
  );
  const thisWeek = weekOf(now.getTime());
  let week = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week -= 1;
  }
  return streak;
}
