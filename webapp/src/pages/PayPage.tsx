import { orderTotalCents, PAYMENT_CURRENCY, type FreeDrink } from '@bbt/shared';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { createPaymentIntent, fetchPaymentStatus } from '../api/client';
import { useCatalogue, useStoreInfo } from '../api/CatalogueProvider';
import { useAuth } from '../auth/AuthProvider';
import { Loading } from '../components/cup/Loading';
import { stripePublishableKey } from '../config';
import { freeDrinkFor } from '../lib/checkout';
import { formatPrice } from '../lib/money';
import { useLoyalty } from '../loyalty/LoyaltyProvider';
import { useStores } from '../store/StoresProvider';
import { useCart } from '../store/hooks';
import './PayPage.css';

/** One Stripe.js instance per session, loaded only when someone reaches /pay. */
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  stripePromise ??= loadStripe(stripePublishableKey());
  return stripePromise;
}

/** The Payment Element dressed in the app's own tokens, read from the live theme. */
function appearanceFromTheme() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim() || undefined;
  return {
    variables: {
      colorPrimary: token('--color-accent'),
      colorBackground: token('--color-surface'),
      colorText: token('--color-text'),
      borderRadius: '8px',
      fontSizeBase: '16px',
    },
  };
}

type Checkout =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; clientSecret: string; amountCents: number };

/**
 * Verifies a payment with the api and places the order when it holds up.
 * The three checks from the spec: Stripe says succeeded, the amount equals the cart's total as it
 * stands now, the currency is AUD, and the metadata marks the intent as ours.
 * Resolves to '' on success (the caller navigates away) or to the message to show.
 */
function useVerifiedPlacement(freeDrink: FreeDrink | undefined, storeId: string | undefined) {
  const { cart: cartStore, orders: ordersStore } = useStores();
  const cart = useCart();
  const loyalty = useLoyalty();
  const navigate = useNavigate();

  return async (paymentIntentId: string): Promise<string> => {
    if (!storeId) return 'The store is still loading; try again in a moment.';
    const status = await fetchPaymentStatus(paymentIntentId);
    if (status.status !== 'succeeded') {
      return 'The payment has not gone through yet, so nothing was placed.';
    }
    const expected = orderTotalCents(cart, freeDrink);
    if (
      !status.fromKangTea ||
      status.currency !== PAYMENT_CURRENCY ||
      status.amountCents !== expected
    ) {
      return 'The payment did not match this order, so nothing was placed.';
    }
    if (freeDrink) {
      // The discount is already in the paid amount; a failed redeem never blocks the paid order.
      await loyalty.redeem().catch(() => undefined);
    }
    ordersStore.place(cart, storeId, new Date(), freeDrink, paymentIntentId);
    cartStore.clear();
    navigate('/order');
    return '';
  };
}

/**
 * Pays for the cart before the order is placed. The cart is the source of truth: the intent is
 * rebuilt from it on mount, and the order is only placed after the api has verified with Stripe
 * that this exact amount, in AUD, on an intent we created, has succeeded.
 */
export function PayPage() {
  const cart = useCart();
  const { catalogue } = useCatalogue();
  const loyalty = useLoyalty();
  const auth = useAuth();
  const store = useStoreInfo();
  const [searchParams] = useSearchParams();
  const [checkout, setCheckout] = useState<Checkout>({ kind: 'loading' });
  const requested = useRef(false);

  const menu = catalogue.kind === 'ready' ? catalogue.menu : undefined;
  const freeDrink = freeDrinkFor(cart, menu, loyalty.state);
  const totalCents = orderTotalCents(cart, freeDrink);
  const placeIfVerified = useVerifiedPlacement(freeDrink, store?.id);
  // A redirect-based payment method lands back here with the intent in the query string.
  const returningIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (cart.length === 0 || totalCents <= 0 || requested.current || !menu || !store) return;
    requested.current = true; // StrictMode mounts twice; one intent (or one verification) is enough.
    if (returningIntentId) {
      placeIfVerified(returningIntentId).then(
        (message) => {
          if (message) setCheckout({ kind: 'failed', message });
        },
        () => setCheckout({ kind: 'failed', message: 'We could not confirm the payment.' }),
      );
      return;
    }
    createPaymentIntent(
      { lines: cart, expectedTotalCents: totalCents, ...(freeDrink ? { freeDrink } : {}) },
      auth.session?.token,
    ).then(
      (intent) =>
        setCheckout({
          kind: 'ready',
          clientSecret: intent.clientSecret,
          amountCents: intent.amountCents,
        }),
      (error: unknown) =>
        setCheckout({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'We could not start the payment.',
        }),
    );
    // The cart cannot change while this page is open in this tab; a change elsewhere is caught at verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, totalCents, menu, store, returningIntentId]);

  if (!stripePublishableKey() || cart.length === 0 || totalCents <= 0) {
    return <Navigate to="/order" replace />;
  }

  return (
    <section className="pay" aria-labelledby="pay-heading">
      <h1 id="pay-heading" className="pay__heading">
        Pay for your order
      </h1>
      {checkout.kind === 'loading' && <Loading>Preparing your payment</Loading>}
      {checkout.kind === 'failed' && (
        <p className="pay__error" role="alert">
          {checkout.message}
        </p>
      )}
      {checkout.kind === 'ready' && store && (
        <Elements
          stripe={getStripe()}
          options={{ clientSecret: checkout.clientSecret, appearance: appearanceFromTheme() }}
        >
          <CheckoutForm
            amountCents={checkout.amountCents}
            freeDrink={freeDrink}
            storeId={store.id}
          />
        </Elements>
      )}
    </section>
  );
}

type CheckoutFormProps = { amountCents: number; freeDrink?: FreeDrink; storeId: string };

function CheckoutForm({ amountCents, freeDrink, storeId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const placeIfVerified = useVerifiedPlacement(freeDrink, storeId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (result.error) {
        setMessage(result.error.message ?? 'The payment did not go through.');
        return;
      }
      if (!result.paymentIntent) {
        setMessage('The payment is still on its way; give it a moment and try again.');
        return;
      }
      setMessage(await placeIfVerified(result.paymentIntent.id));
    } catch {
      setMessage(
        'We could not confirm the payment. Your card may not have been charged; please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pay__form" onSubmit={(event) => void pay(event)}>
      <PaymentElement />
      {message && (
        <p className="pay__error" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="pay__submit" disabled={busy || !stripe}>
        {busy ? 'Paying' : `Pay ${formatPrice(amountCents)}`}
      </button>
      <button type="button" className="pay__back" onClick={() => navigate('/order')}>
        Back to your order
      </button>
    </form>
  );
}
