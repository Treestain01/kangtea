import type { Store } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { describeOpeningStatus, formatLocalTime, openingStatus } from './openingHours';

const weekday = { open: '11:30', close: '20:00' };
const weekend = { open: '11:30', close: '20:30' };

const store: Store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  timezone: 'Australia/Brisbane',
  hours: {
    mon: weekday,
    tue: weekday,
    wed: weekday,
    thu: weekday,
    fri: weekend,
    sat: weekend,
    sun: null,
  },
};

// Brisbane is UTC+10 all year. 2026-09-24 is a Thursday.
const brisbane = (isoLocal: string) => new Date(`${isoLocal}+10:00`);

describe('openingStatus', () => {
  it('is open during trading hours', () => {
    expect(openingStatus(store, brisbane('2026-09-24T12:00:00'))).toEqual({
      kind: 'open',
      closesAt: '20:00',
    });
  });

  it('is open right at opening time', () => {
    expect(openingStatus(store, brisbane('2026-09-24T11:30:00')).kind).toBe('open');
  });

  it('is closed right at closing time', () => {
    expect(openingStatus(store, brisbane('2026-09-24T20:00:00')).kind).toBe('closed');
  });

  it('reports today’s opening time before the shop opens', () => {
    expect(openingStatus(store, brisbane('2026-09-24T09:00:00'))).toEqual({
      kind: 'closed',
      opensAt: '11:30',
      when: 'today',
    });
  });

  it('reports tomorrow after closing', () => {
    expect(openingStatus(store, brisbane('2026-09-24T21:00:00'))).toEqual({
      kind: 'closed',
      opensAt: '11:30',
      when: 'tomorrow',
    });
  });

  it('is closed all day on a day with no hours and points at tomorrow', () => {
    // 2026-09-27 is a Sunday.
    expect(openingStatus(store, brisbane('2026-09-27T13:00:00'))).toEqual({
      kind: 'closed-today',
      opensAt: '11:30',
      when: 'tomorrow',
    });
  });

  it('skips closed days when finding the next opening', () => {
    // Saturday after close: Sunday is closed, so Monday.
    expect(openingStatus(store, brisbane('2026-09-26T21:00:00'))).toEqual({
      kind: 'closed',
      opensAt: '11:30',
      when: 'mon',
    });
  });

  it('evaluates in the store’s time zone, not the machine’s', () => {
    // 02:00 UTC is noon in Brisbane.
    expect(openingStatus(store, new Date('2026-09-24T02:00:00Z')).kind).toBe('open');
  });
});

describe('formatLocalTime', () => {
  it('formats 24 hour times as 12 hour with am/pm', () => {
    expect(formatLocalTime('11:30')).toBe('11:30 am');
    expect(formatLocalTime('20:00')).toBe('8:00 pm');
    expect(formatLocalTime('00:15')).toBe('12:15 am');
    expect(formatLocalTime('12:00')).toBe('12:00 pm');
  });
});

describe('describeOpeningStatus', () => {
  it('writes each state for people', () => {
    expect(describeOpeningStatus({ kind: 'open', closesAt: '20:00' })).toBe('Open until 8:00 pm');
    expect(describeOpeningStatus({ kind: 'closed', opensAt: '11:30', when: 'today' })).toBe(
      'Opens at 11:30 am',
    );
    expect(describeOpeningStatus({ kind: 'closed', opensAt: '11:30', when: 'tomorrow' })).toBe(
      'Opens tomorrow at 11:30 am',
    );
    expect(describeOpeningStatus({ kind: 'closed', opensAt: '11:30', when: 'mon' })).toBe(
      'Opens Monday at 11:30 am',
    );
    expect(describeOpeningStatus({ kind: 'closed-today', opensAt: '11:30', when: 'mon' })).toBe(
      'Closed today, opens Monday at 11:30 am',
    );
    expect(
      describeOpeningStatus({ kind: 'closed-today', opensAt: '11:30', when: 'tomorrow' }),
    ).toBe('Closed today, opens tomorrow at 11:30 am');
  });
});
