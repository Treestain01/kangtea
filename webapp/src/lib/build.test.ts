import { describe, expect, it } from 'vitest';
import { customisationsFixture, menuItemFixture } from '../store/testing';
import { buildUrl, decodeBuild, encodeBuild } from './build';

const menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [menuItemFixture()],
  customisations: customisationsFixture,
};
const sugar50 = customisationsFixture.sugarLevels[0]!;
const sugar100 = customisationsFixture.sugarLevels[1]!;
const iceLess = customisationsFixture.iceLevels[0]!;
const iceRegular = customisationsFixture.iceLevels[1]!;
const pearls = customisationsFixture.toppings[0]!;
const pudding = customisationsFixture.toppings[1]!;

describe('build links', () => {
  it('encodes the drink, levels and toppings with their lots', () => {
    expect(
      encodeBuild({
        item: menuItemFixture(),
        sugar: sugar50,
        ice: iceLess,
        toppings: [
          { topping: pearls, quantity: 2 },
          { topping: pudding, quantity: 1 },
        ],
      }),
    ).toBe('signature-milk-tea~sugar-50~ice-less~pearls.2,pudding');
  });

  it('decodes a build back against the menu', () => {
    const build = decodeBuild('signature-milk-tea~sugar-50~ice-less~pearls.2,pudding', menu);
    expect(build?.item.id).toBe('signature-milk-tea');
    expect(build?.sugar).toEqual(sugar50);
    expect(build?.ice).toEqual(iceLess);
    expect(build?.toppings).toEqual({ pearls: 2, pudding: 1 });
  });

  it('is forgiving: unknown levels fall back to the defaults, unknown toppings drop, lots are capped', () => {
    const build = decodeBuild('signature-milk-tea~sugar-9~ice-9~pearls.9,gold,pudding.x', menu);
    expect(build?.sugar).toEqual(sugar100);
    expect(build?.ice).toEqual(iceRegular);
    expect(build?.toppings).toEqual({ pearls: 3, pudding: 1 });
    expect(decodeBuild('signature-milk-tea', menu)?.toppings).toEqual({});
  });

  it('gives nothing for a drink the menu does not have', () => {
    expect(decodeBuild('unicorn-tea~sugar-50~ice-less~', menu)).toBeNull();
    expect(decodeBuild('', menu)).toBeNull();
  });

  it('makes a link on the site origin', () => {
    expect(
      buildUrl(
        { item: menuItemFixture(), sugar: sugar100, ice: iceRegular, toppings: [] },
        'https://kangtea-webapp.vercel.app',
      ),
    ).toBe(
      'https://kangtea-webapp.vercel.app/menu?build=signature-milk-tea%7Esugar-100%7Eice-regular%7E',
    );
  });
});
