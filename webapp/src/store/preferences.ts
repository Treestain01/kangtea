import { z } from 'zod';

/** How the person wants the app to look. `system` follows the device setting. */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const ThemePreferenceSchema = z.enum(THEME_PREFERENCES);
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

/**
 * Device level preferences. These are not part of the account contract: they describe this
 * device, so they stay here when the profile moves to the API and survive "Clear my data".
 */
export const PreferencesSchema = z.object({
  theme: ThemePreferenceSchema,
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system' };
