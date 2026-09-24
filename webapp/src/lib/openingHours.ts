import type { Store, Weekday } from '@bbt/shared';

const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export type OpeningStatus =
  | { kind: 'open'; closesAt: string }
  | { kind: 'closed'; opensAt: string; when: 'today' | 'tomorrow' | Weekday }
  | { kind: 'closed-today'; opensAt: string; when: 'tomorrow' | Weekday };

/** Minutes since midnight for an "HH:MM" string. */
function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** The store's local weekday and minutes since midnight at `now`. */
function localClock(now: Date, timezone: string): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = read('weekday').slice(0, 3).toLowerCase() as Weekday;
  return { weekday, minutes: Number(read('hour')) * 60 + Number(read('minute')) };
}

/** Works out whether the store is trading right now, in the store's own time zone. */
export function openingStatus(store: Store, now: Date = new Date()): OpeningStatus {
  const { weekday, minutes } = localClock(now, store.timezone);
  const today = store.hours[weekday];

  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { kind: 'open', closesAt: today.close };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { kind: 'closed', opensAt: today.open, when: 'today' };
  }

  const todayIndex = WEEKDAYS.indexOf(weekday);
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = WEEKDAYS[(todayIndex + offset) % 7] as Weekday;
    const hours = store.hours[day];
    if (hours) {
      const when = offset === 1 ? 'tomorrow' : day;
      return today
        ? { kind: 'closed', opensAt: hours.open, when }
        : { kind: 'closed-today', opensAt: hours.open, when };
    }
  }
  // Every day is null. Treat as closed with no reopening; callers show "Closed".
  return { kind: 'closed-today', opensAt: '00:00', when: weekday };
}

/** "20:00" becomes "8:00 pm". */
export function formatLocalTime(time: string): string {
  const [hoursRaw = '0', minutes = '00'] = time.split(':');
  const hours24 = Number(hoursRaw);
  const suffix = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${suffix}`;
}

function whenLabel(when: 'today' | 'tomorrow' | Weekday): string {
  if (when === 'today') return '';
  if (when === 'tomorrow') return 'tomorrow ';
  return `${WEEKDAY_NAMES[when]} `;
}

/** Human sentence for the header, for example "Open until 8:00 pm". */
export function describeOpeningStatus(status: OpeningStatus): string {
  switch (status.kind) {
    case 'open':
      return `Open until ${formatLocalTime(status.closesAt)}`;
    case 'closed':
      return `Opens ${whenLabel(status.when)}at ${formatLocalTime(status.opensAt)}`;
    case 'closed-today':
      return `Closed today, opens ${whenLabel(status.when)}at ${formatLocalTime(status.opensAt)}`;
  }
}
