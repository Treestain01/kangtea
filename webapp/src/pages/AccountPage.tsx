import {
  AccountUpdateSchema,
  SignInRequestSchema,
  SignUpRequestSchema,
  type Store,
} from '@bbt/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, fetchStore } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { describeOpeningStatus, openingStatus } from '../lib/openingHours';
import { useStores } from '../store/StoresProvider';
import { usePreferences } from '../store/hooks';
import type { ThemePreference } from '../store/preferences';
import './AccountPage.css';

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Issues = { path: PropertyKey[]; message: string }[];

/** First message per field from a Zod failure, keyed by the field name. */
function fieldErrors<K extends string>(
  issues: Issues,
  fields: readonly K[],
): Partial<Record<K, string>> {
  const next: Partial<Record<K, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && (fields as readonly string[]).includes(field)) {
      next[field as K] ??= issue.message;
    }
  }
  return next;
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

/** Account: sign in or create an account, the profile, appearance, the store card, and clearing this device. */
export function AccountPage() {
  const stores = useStores();
  const auth = useAuth();
  const preferences = usePreferences();
  const [store, setStore] = useState<Store | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearedMessage, setClearedMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStore()
      .then((loaded) => {
        if (!cancelled) setStore(loaded);
      })
      .catch(() => {
        if (!cancelled) setStore(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseTheme = (theme: ThemePreference) => {
    stores.preferences.save({ ...preferences, theme });
  };

  const clearEverything = async () => {
    stores.cart.clear();
    stores.orders.clear();
    await auth.signOut();
    setConfirmingClear(false);
    setClearedMessage('Your data has been cleared and you are signed out');
  };

  return (
    <section className="account" aria-labelledby="account-heading">
      <h2 id="account-heading" className="account__heading">
        Account
      </h2>

      {auth.session ? <ProfileForm /> : <SignInCard />}

      <fieldset className="appearance">
        <legend className="appearance__legend">Appearance</legend>
        <p className="appearance__copy">
          System follows your device setting. Saved on this device.
        </p>
        <div className="appearance__options">
          {THEME_OPTIONS.map(({ value, label }) => (
            <label key={value} className="appearance__option">
              <input
                className="appearance__radio"
                type="radio"
                name="theme"
                value={value}
                checked={preferences.theme === value}
                onChange={() => chooseTheme(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="storecard" aria-labelledby="storecard-heading">
        <h3 id="storecard-heading" className="storecard__heading">
          Your store
        </h3>
        {store ? (
          <>
            <p className="storecard__name">{store.name}</p>
            <p className="storecard__address">
              {store.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <span>
                {store.suburb} {store.state} {store.postcode}
              </span>
            </p>
            <p className="storecard__hours">{describeOpeningStatus(openingStatus(store))}</p>
            {store.phone && (
              <a className="storecard__phone" href={`tel:${store.phone.replace(/\D/g, '')}`}>
                {store.phone}
              </a>
            )}
          </>
        ) : (
          <p className="storecard__loading">Finding your store</p>
        )}
      </section>

      <section className="danger" aria-labelledby="danger-heading">
        <h3 id="danger-heading" className="danger__heading">
          Your data
        </h3>
        <p className="danger__copy">
          Your cart and orders are stored on this device only. Your account is kept by Kang Tea.
        </p>
        {confirmingClear ? (
          <div className="danger__confirm" role="group" aria-label="Confirm clearing your data">
            <p>This removes your cart and orders from this device and signs you out.</p>
            <div className="danger__actions">
              <button type="button" className="danger__yes" onClick={() => void clearEverything()}>
                Yes, clear everything
              </button>
              <button
                type="button"
                className="account__secondary"
                onClick={() => setConfirmingClear(false)}
              >
                Keep my data
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="account__secondary"
            onClick={() => setConfirmingClear(true)}
          >
            Clear my data
          </button>
        )}
        <p className="account__message" role="status">
          {clearedMessage}
        </p>
      </section>
    </section>
  );
}

type Mode = 'sign-in' | 'sign-up';
type CredentialField = 'displayName' | 'email' | 'password';
const CREDENTIAL_FIELDS: readonly CredentialField[] = ['displayName', 'email', 'password'];

/** Sign in or create an account. Shown while signed out. */
function SignInCard() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<CredentialField, string>>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFailure('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure('');
    const run = async () => {
      if (mode === 'sign-up') {
        const parsed = SignUpRequestSchema.safeParse({ email, password, displayName });
        if (!parsed.success) return parsed.error.issues;
        await auth.signUp(parsed.data);
      } else {
        const parsed = SignInRequestSchema.safeParse({ email, password });
        if (!parsed.success) return parsed.error.issues;
        await auth.signIn(parsed.data);
      }
      return [];
    };
    setBusy(true);
    try {
      const issues = await run();
      setErrors(fieldErrors(issues, CREDENTIAL_FIELDS));
    } catch (error) {
      setErrors({});
      setFailure(describeFailure(error));
    } finally {
      setBusy(false);
    }
  };

  const isSignUp = mode === 'sign-up';

  return (
    <section className="signin" aria-labelledby="signin-heading">
      <h3 id="signin-heading" className="signin__heading">
        {isSignUp ? 'Create your account' : 'Sign in'}
      </h3>
      <p className="signin__copy">
        {isSignUp
          ? 'Save your details for faster ordering.'
          : 'Sign in to see your details on every device.'}
      </p>
      <div className="signin__modes" role="group" aria-label="Sign in or create an account">
        <button
          type="button"
          className="signin__mode"
          aria-pressed={!isSignUp}
          onClick={() => switchMode('sign-in')}
        >
          Sign in
        </button>
        <button
          type="button"
          className="signin__mode"
          aria-pressed={isSignUp}
          onClick={() => switchMode('sign-up')}
        >
          Create account
        </button>
      </div>

      <form
        className="signin__form"
        aria-labelledby="signin-heading"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        {isSignUp && (
          <div className="field">
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              name="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={errors.displayName ? 'signup-name-error' : undefined}
            />
            {errors.displayName && (
              <p id="signup-name-error" className="field__error">
                {errors.displayName}
              </p>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'auth-email-error' : undefined}
          />
          {errors.email && (
            <p id="auth-email-error" className="field__error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'auth-password-error' : undefined}
          />
          {errors.password && (
            <p id="auth-password-error" className="field__error">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className="account__primary" disabled={busy}>
          {isSignUp ? 'Create account' : 'Sign in'}
        </button>
        {failure && (
          <p className="account__error" role="alert">
            {failure}
          </p>
        )}
      </form>
    </section>
  );
}

type ProfileField = 'displayName' | 'phone';
const PROFILE_FIELDS: readonly ProfileField[] = ['displayName', 'phone'];

/** The signed in person's profile, saved to the api. */
function ProfileForm() {
  const auth = useAuth();
  const account = auth.session?.account;
  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [marketingOptIn, setMarketingOptIn] = useState(account?.marketingOptIn ?? false);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = AccountUpdateSchema.safeParse({
      displayName,
      phone: phone.trim() === '' ? undefined : phone.trim(),
      marketingOptIn,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues, PROFILE_FIELDS));
      setMessage('');
      return;
    }
    setErrors({});
    setFailure('');
    setBusy(true);
    try {
      await auth.updateAccount(parsed.data);
      setMessage('Saved');
    } catch (error) {
      setMessage('');
      setFailure(describeFailure(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="account__form" onSubmit={(event) => void save(event)} noValidate>
      <p className="account__signedin">
        Signed in as <strong>{auth.session?.user.email}</strong>
      </p>

      <div className="field">
        <label htmlFor="displayName">Name</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? 'displayName-error' : undefined}
        />
        {errors.displayName && (
          <p id="displayName-error" className="field__error">
            {errors.displayName}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone">Mobile (optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="field__error">
            {errors.phone}
          </p>
        )}
      </div>

      <label className="field__check">
        <input
          id="marketingOptIn"
          name="marketingOptIn"
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <span>Tell me about new drinks and deals</span>
      </label>

      <div className="account__actions">
        <button type="submit" className="account__primary" disabled={busy}>
          Save
        </button>
        <button type="button" className="account__secondary" onClick={() => void auth.signOut()}>
          Sign out
        </button>
      </div>
      <p className="account__message" role="status">
        {message}
      </p>
      {failure && (
        <p className="account__error" role="alert">
          {failure}
        </p>
      )}
    </form>
  );
}
