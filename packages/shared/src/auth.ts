import { z } from 'zod';
import { AccountSchema } from './account.js';

/** Login identity. Stored lower cased and trimmed. */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('That email address does not look right'));

export const PasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'That password is too long');

/** The signed in person as the api knows them. Profile fields live on `Account`. */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: EmailSchema,
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const SignUpRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: AccountSchema.shape.displayName,
});
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignInRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

/** What a person may change about their own account. Email and creation date are not editable here. */
export const AccountUpdateSchema = AccountSchema.omit({ email: true, createdAt: true });
export type AccountUpdate = z.infer<typeof AccountUpdateSchema>;

/** The signed in user with their profile. */
export const MeResponseSchema = z.object({
  user: UserSchema,
  account: AccountSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/**
 * Returned by sign up and sign in. `token` is an opaque bearer token the webapp sends as
 * `Authorization: Bearer <token>`; it is the only credential the webapp keeps.
 */
export const AuthSessionSchema = MeResponseSchema.extend({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;
