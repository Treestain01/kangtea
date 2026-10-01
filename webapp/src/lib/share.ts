/**
 * Sharing a drink: the device's share sheet where there is one, with the cup image when it will
 * take files, and the link copied to the clipboard everywhere else.
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export type ShareRequest = {
  title: string;
  text: string;
  url: string;
  /** A PNG of the cup, attached when the share sheet accepts files. */
  image?: File | null;
};

type Sharer = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText(text: string): Promise<void> };
};

export async function shareDrink(
  request: ShareRequest,
  sharer: Sharer = navigator as Sharer,
): Promise<ShareOutcome> {
  const data: ShareData = { title: request.title, text: request.text, url: request.url };
  if (typeof sharer.share === 'function') {
    const withImage = request.image ? { ...data, files: [request.image] } : data;
    const payload = sharer.canShare?.(withImage) ? withImage : data;
    try {
      await sharer.share(payload);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Fall through to copying; some browsers refuse a share they advertised.
    }
  }
  try {
    await sharer.clipboard?.writeText(request.url);
    return sharer.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}

/** What to tell the person after a share attempt. Empty when they cancelled. */
export function describeShareOutcome(outcome: ShareOutcome): string {
  switch (outcome) {
    case 'shared':
      return 'Shared';
    case 'copied':
      return 'Link copied';
    case 'cancelled':
      return '';
    case 'failed':
      return 'Could not share from here';
  }
}
