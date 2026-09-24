import { z } from 'zod';

/** A customer profile. Local to the device until accounts exist on the API. */
export const AccountSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(60),
  email: z.email('That email address does not look right').optional(),
  /** Free text: Australian mobile and landline formats vary too much to validate tightly yet. */
  phone: z.string().trim().min(6, 'That phone number is too short').max(20).optional(),
  marketingOptIn: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Account = z.infer<typeof AccountSchema>;
