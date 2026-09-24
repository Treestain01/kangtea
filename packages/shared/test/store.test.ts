import { describe, expect, it } from 'vitest';
import { LocalTimeSchema, StoreSchema } from '../src/index';

const open = { open: '11:30', close: '20:00' };

const valid = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['Shop 29a, Calamvale Central', '662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  phone: '07 3711 4663',
  timezone: 'Australia/Brisbane',
  hours: { mon: open, tue: open, wed: open, thu: open, fri: open, sat: open, sun: null },
};

describe('LocalTimeSchema', () => {
  it('accepts 24 hour HH:MM', () => {
    expect(LocalTimeSchema.safeParse('00:00').success).toBe(true);
    expect(LocalTimeSchema.safeParse('23:59').success).toBe(true);
  });

  it('rejects 12 hour and malformed times', () => {
    expect(LocalTimeSchema.safeParse('8:00 pm').success).toBe(false);
    expect(LocalTimeSchema.safeParse('24:00').success).toBe(false);
    expect(LocalTimeSchema.safeParse('11:60').success).toBe(false);
  });
});

describe('StoreSchema', () => {
  it('accepts a complete store', () => {
    expect(StoreSchema.safeParse(valid).success).toBe(true);
  });

  it('allows a closed day as null', () => {
    const parsed = StoreSchema.parse(valid);
    expect(parsed.hours.sun).toBeNull();
  });

  it('requires hours for every weekday', () => {
    const missingSunday = { mon: open, tue: open, wed: open, thu: open, fri: open, sat: open };
    expect(StoreSchema.safeParse({ ...valid, hours: missingSunday }).success).toBe(false);
  });

  it('requires at least one address line', () => {
    expect(StoreSchema.safeParse({ ...valid, addressLines: [] }).success).toBe(false);
  });

  it('treats phone as optional', () => {
    const withoutPhone = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'phone'),
    );
    expect(StoreSchema.safeParse(withoutPhone).success).toBe(true);
  });
});
