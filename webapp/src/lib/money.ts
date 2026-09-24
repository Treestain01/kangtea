const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

/** Formats whole cents as Australian dollars, for example 750 becomes "$7.50". */
export function formatPrice(priceCents: number): string {
  return aud.format(priceCents / 100);
}
