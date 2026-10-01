import { z } from 'zod';

/** How the person wants the app to look. `system` follows the device setting. */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const ThemePreferenceSchema = z.enum(THEME_PREFERENCES);
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

/**
 * Device level preferences. These are not part of the account contract: they describe this
 * device, so they stay here when the profile moves to the API and survive "Clear my data".
 * New fields default so preferences saved before they existed still parse.
 */
export const PreferencesSchema = z.object({
  theme: ThemePreferenceSchema,
  /** Soft sounds for the cup: a plop when a pearl drops, a click when a lid goes on. Off by default. */
  sounds: z.boolean().default(false),
  /** With the theme on system, go dark while the shop is closed. */
  eveningMode: z.boolean().default(false),
});
export type Preferences = z.infer<typeof PreferencesSchema>;
/** What callers may pass to save: the defaults fill in anything left out. */
export type PreferencesInput = z.input<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  sounds: false,
  eveningMode: false,
};
