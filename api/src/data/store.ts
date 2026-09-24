import type { Store } from '@bbt/shared';

/**
 * Kang Tea's only location.
 *
 * Address and phone come from the Calamvale Central store directory.
 * Opening hours come from the shop's public listings (11:30 am open, 8:00 pm close Mon to Thu,
 * 8:30 pm Fri to Sun). The centre directory shows a generic 11 am to 10 pm, which looks like a
 * default. Confirm with the shop before launch.
 */
export const store: Store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['Shop 29a, Calamvale Central', '662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  phone: '07 3711 4663',
  timezone: 'Australia/Brisbane',
  hours: {
    mon: { open: '11:30', close: '20:00' },
    tue: { open: '11:30', close: '20:00' },
    wed: { open: '11:30', close: '20:00' },
    thu: { open: '11:30', close: '20:00' },
    fri: { open: '11:30', close: '20:30' },
    sat: { open: '11:30', close: '20:30' },
    sun: { open: '11:30', close: '20:30' },
  },
};
