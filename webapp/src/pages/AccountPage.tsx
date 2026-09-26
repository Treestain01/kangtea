import { AccountSchema, type Store } from '@bbt/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchStore } from '../api/client';
import { describeOpeningStatus, openingStatus } from '../lib/openingHours';
import { useStores } from '../store/StoresProvider';
import { useAccount, usePreferences } from '../store/hooks';
import type { ThemePreference } from '../store/preferences';
import './AccountPage.css';

type FieldErrors = Partial<Record<'displayName' | 'email' | 'phone', string>>;

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Local profile, appearance, the store card, and clearing everything on this device. */
export function AccountPage() {
  const stores = useStores();
  const account = useAccount();
  const preferences = usePreferences();

  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [marketingOptIn, setMarketingOptIn] = useState(account?.marketingOptIn ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [store, setStore] = useState<Store | null>(null);

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

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = AccountSchema.safeParse({
      displayName,
      email: email.trim() === '' ? undefined : email.trim(),
      phone: phone.trim() === '' ? undefined : phone.trim(),
      marketingOptIn,
      createdAt: account?.createdAt ?? new Date().toISOString(),
    });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'displayName' || field === 'email' || field === 'phone') {
          next[field] ??= issue.message;
        }
      }
      setErrors(next);
      setMessage('');
      return;
    }
    stores.account.save(result.data);
    setErrors({});
    setMessage('Saved');
  };

  const chooseTheme = (theme: ThemePreference) => {
    stores.preferences.save({ ...preferences, theme });
  };

  const clearEverything = () => {
    stores.cart.clear();
    stores.orders.clear();
    stores.account.clear();
    setDisplayName('');
    setEmail('');
    setPhone('');
    setMarketingOptIn(false);
    setErrors({});
    setConfirmingClear(false);
    setMessage('Your data has been cleared');
  };

  return (
    <section className="account" aria-labelledby="account-heading">
      <h2 id="account-heading" className="account__heading">
        Account
      </h2>

      <form className="account__form" onSubmit={save} noValidate>
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
          <label htmlFor="email">Email (optional)</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="field__error">
              {errors.email}
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

        <button type="submit" className="account__primary">
          Save
        </button>
        <p className="account__message" role="status">
          {message}
        </p>
      </form>

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
          Your cart, orders and profile are stored on this device only.
        </p>
        {confirmingClear ? (
          <div className="danger__confirm" role="group" aria-label="Confirm clearing your data">
            <p>This removes your cart, orders and profile from this device.</p>
            <div className="danger__actions">
              <button type="button" className="danger__yes" onClick={clearEverything}>
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
      </section>
    </section>
  );
}
