import { describe, expect, it, vi } from 'vitest';
import { describeShareOutcome, shareDrink } from './share';

const request = {
  title: 'Signature Fruit Tea at Kang Tea',
  text: '50% sugar, less ice, two lots of boba',
  url: 'https://kangtea.app/menu?build=x',
};

describe('shareDrink', () => {
  it('uses the share sheet, with the image when it is accepted', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const image = new File(['png'], 'cup.png', { type: 'image/png' });
    const outcome = await shareDrink(
      { ...request, image },
      { share, canShare: (data) => Boolean(data.files) },
    );
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: request.url, files: [image] }),
    );
  });

  it('leaves the image out when the sheet will not take files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const image = new File(['png'], 'cup.png', { type: 'image/png' });
    await shareDrink({ ...request, image }, { share, canShare: () => false });
    expect(share.mock.calls[0]?.[0]).not.toHaveProperty('files');
  });

  it('reports a cancelled sheet without copying', async () => {
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    const writeText = vi.fn();
    const outcome = await shareDrink(request, {
      share: () => Promise.reject(abort),
      clipboard: { writeText },
    });
    expect(outcome).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link where there is no share sheet, and fails where there is no clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareDrink(request, { clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(request.url);
    expect(await shareDrink(request, {})).toBe('failed');
  });

  it('describes each outcome', () => {
    expect(describeShareOutcome('shared')).toBe('Shared');
    expect(describeShareOutcome('copied')).toBe('Link copied');
    expect(describeShareOutcome('cancelled')).toBe('');
    expect(describeShareOutcome('failed')).toBe('Could not share from here');
  });
});
