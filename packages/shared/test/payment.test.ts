import { describe, expect, it } from 'vitest';
import {
  PAYMENT_CURRENCY,
  PaymentIntentRequestSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
} from '../src/index.js';

const line = {
  itemId: 'orange-green-tea',
  name: 'Orange Green Tea',
  unitPriceCents: 800,
  quantity: 1,
  customisations: [],
};

describe('PaymentIntentRequestSchema', () => {
  it('accepts lines with an expected total and an optional free drink', () => {
    expect(
      PaymentIntentRequestSchema.safeParse({ lines: [line], expectedTotalCents: 800 }).success,
    ).toBe(true);
    expect(
      PaymentIntentRequestSchema.safeParse({
        lines: [line],
        expectedTotalCents: 100,
        freeDrink: { lineIndex: 0, cents: 700 },
      }).success,
    ).toBe(true);
  });

  it('rejects an empty cart and a non positive total', () => {
    expect(
      PaymentIntentRequestSchema.safeParse({ lines: [], expectedTotalCents: 800 }).success,
    ).toBe(false);
    expect(
      PaymentIntentRequestSchema.safeParse({ lines: [line], expectedTotalCents: 0 }).success,
    ).toBe(false);
  });
});

describe('PaymentIntentResponseSchema', () => {
  it('accepts an aud intent and rejects any other currency', () => {
    const response = {
      paymentIntentId: 'pi_1',
      clientSecret: 'pi_1_secret_x',
      amountCents: 800,
      currency: PAYMENT_CURRENCY,
    };
    expect(PaymentIntentResponseSchema.safeParse(response).success).toBe(true);
    expect(PaymentIntentResponseSchema.safeParse({ ...response, currency: 'usd' }).success).toBe(
      false,
    );
  });
});

describe('PaymentStatusResponseSchema', () => {
  it('accepts a verified status and rejects an unknown status word', () => {
    const response = {
      paymentIntentId: 'pi_1',
      status: 'succeeded',
      amountCents: 800,
      currency: 'aud',
      fromKangTea: true,
    };
    expect(PaymentStatusResponseSchema.safeParse(response).success).toBe(true);
    expect(PaymentStatusResponseSchema.safeParse({ ...response, status: 'paid' }).success).toBe(
      false,
    );
  });
});
