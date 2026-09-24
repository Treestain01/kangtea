import { z } from 'zod';

export const WeekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export type Weekday = z.infer<typeof WeekdaySchema>;

/** Local wall clock time as 24 hour "HH:MM". */
export const LocalTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'expected a 24 hour time like 11:30');

export const OpeningHoursSchema = z.object({
  open: LocalTimeSchema,
  close: LocalTimeSchema,
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

export const StoreSchema = z.object({
  id: z.string().min(1),
  /** Full name, for example "Kang Tea Calamvale Central". */
  name: z.string().min(1),
  /** Short name used in tight UI, for example "Calamvale Central". */
  shortName: z.string().min(1),
  addressLines: z.array(z.string().min(1)).min(1),
  suburb: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
  phone: z.string().min(1).optional(),
  /** IANA time zone the opening hours are expressed in. */
  timezone: z.string().min(1),
  /** Hours for every weekday. `null` means closed that day. */
  hours: z.record(WeekdaySchema, OpeningHoursSchema.nullable()),
});
export type Store = z.infer<typeof StoreSchema>;
