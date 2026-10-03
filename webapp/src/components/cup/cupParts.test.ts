import { describe, expect, it } from 'vitest';
import {
  artForTopping,
  capsFor,
  foamBandFor,
  iceCubeCount,
  icePieces,
  liquidTopFor,
  piecesFor,
  PRODUCT_COLOURS,
  productColourVars,
  showsSteam,
  teaColourMix,
} from './cupParts';

const topping = (name: string, priceCents = 100) => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  priceCents,
});

describe('artForTopping', () => {
  it('recognises the board toppings by name', () => {
    expect(artForTopping(topping('Boba'))).toMatchObject({
      kind: 'sink',
      symbol: 'kt-pearl',
      perLot: 10,
    });
    expect(artForTopping(topping('Mini Pearls'))).toMatchObject({
      symbol: 'kt-pearl-mini',
      perLot: 36,
    });
    expect(artForTopping(topping('Mixed Pearls'))).toMatchObject({
      symbol: 'kt-pearl',
      alt: 'kt-pearl-mini',
    });
    expect(artForTopping(topping('Grass Jelly'))).toMatchObject({
      symbol: 'kt-jelly-cube',
      perLot: 8,
      tint: PRODUCT_COLOURS.pearl,
    });
    expect(artForTopping(topping('Tea Jelly'))).toMatchObject({
      symbol: 'kt-jelly-cube',
      tint: PRODUCT_COLOURS.teaJelly,
    });
    expect(artForTopping(topping('Milk Foam'))).toMatchObject({ kind: 'cap' });
    expect(artForTopping(topping('Brulee'))).toMatchObject({ kind: 'cap' });
    expect(artForTopping(topping('Vanilla Ice Cream'))).toMatchObject({
      symbol: 'kt-ice-cream-scoop',
      size: 40,
      perLot: 1,
    });
    expect(artForTopping(topping('Pudding'))).toMatchObject({ symbol: 'kt-pudding', perLot: 1 });
    expect(artForTopping(topping('Water Chestnut Popping Ball'))).toMatchObject({
      symbol: 'kt-popping-ball',
    });
    expect(artForTopping(topping('Mini Taro Ball'))).toMatchObject({ symbol: 'kt-taro-ball' });
    expect(artForTopping(topping('Boba, Mini Pearls & Grass Jelly'))).toMatchObject({
      symbol: 'kt-pearl',
      alt: 'kt-jelly-cube',
    });
  });

  it('falls back to pearls for a topping it has never heard of', () => {
    expect(artForTopping(topping('Dragon Dust'))).toMatchObject({
      kind: 'sink',
      symbol: 'kt-pearl',
    });
  });
});

describe('piecesFor', () => {
  it('makes one body per piece per lot with stable keys, skipping caps', () => {
    const specs = piecesFor([
      { topping: topping('Boba'), quantity: 2 },
      { topping: topping('Milk Foam'), quantity: 1 },
      { topping: topping('Pudding'), quantity: 1 },
    ]);
    expect(specs).toHaveLength(21);
    expect(specs.filter((s) => s.symbol === 'kt-pearl')).toHaveLength(20);
    expect(specs.find((s) => s.symbol === 'kt-pudding')).toMatchObject({ shape: 'box', size: 30 });
    expect(new Set(specs.map((s) => s.key)).size).toBe(21);
    expect(specs[0]?.key).toBe('boba:0:0');
  });

  it('alternates pearls and mini pearls for mixed pearls', () => {
    const specs = piecesFor([{ topping: topping('Mixed Pearls'), quantity: 1 }]);
    expect(specs).toHaveLength(10);
    expect(specs.map((s) => s.symbol)).toEqual([
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
      'kt-pearl-mini',
    ]);
  });

  it('gives mini pearls a hitbox smaller than their art', () => {
    for (const spec of piecesFor([{ topping: topping('Mini Pearls'), quantity: 1 }])) {
      expect(spec).toMatchObject({ size: 12, bodySize: 8 });
    }
    const mixed = piecesFor([{ topping: topping('Mixed Pearls'), quantity: 1 }]);
    for (const spec of mixed.filter((s) => s.symbol === 'kt-pearl-mini')) {
      expect(spec).toMatchObject({ size: 12, bodySize: 8 });
    }
    for (const spec of mixed.filter((s) => s.symbol === 'kt-pearl')) {
      expect(spec.bodySize).toBeUndefined();
    }
  });
});

describe('caps and the tea level', () => {
  it('lowers the tea by the thickest cap, brulee first', () => {
    expect(liquidTopFor([])).toBe(44);
    const caps = capsFor([
      { topping: topping('Milk Foam'), quantity: 1 },
      { topping: topping('Brulee'), quantity: 1 },
    ]);
    expect(caps.map((c) => c.symbol)).toEqual(['kt-brulee', 'kt-foam-cap']);
    expect(liquidTopFor(caps)).toBe(60);
    expect(liquidTopFor(capsFor([{ topping: topping('Brulee'), quantity: 1 }]))).toBe(50);
  });

  it('drops the tea further with every extra foam lot', () => {
    const foam = (quantity: number) => capsFor([{ topping: topping('Milk Foam'), quantity }])[0];
    expect(foam(1)).toMatchObject({ drop: 16 });
    expect(foam(2)).toMatchObject({ drop: 30 });
    expect(foam(3)).toMatchObject({ drop: 44 });
    expect(liquidTopFor(capsFor([{ topping: topping('Milk Foam'), quantity: 2 }]))).toBe(74);
  });

  it('sizes the foam band to sit on the tea and rise a lip above the resting line', () => {
    expect(foamBandFor([])).toBe(0);
    expect(foamBandFor(capsFor([{ topping: topping('Brulee'), quantity: 1 }]))).toBe(0);
    const band = (quantity: number) =>
      foamBandFor(capsFor([{ topping: topping('Milk Foam'), quantity }]));
    // liquidTop - band keeps the top edge at 42 whatever the quantity.
    expect(band(1)).toBe(18);
    expect(band(2)).toBe(32);
    expect(band(3)).toBe(46);
  });

  it('keeps the brulee crust one lot thick no matter the quantity', () => {
    expect(liquidTopFor(capsFor([{ topping: topping('Brulee'), quantity: 3 }]))).toBe(50);
  });
});

describe('productColourVars', () => {
  it('colours mini pearls the same dark brown as standard pearls', () => {
    const vars = productColourVars();
    expect(vars['--pearl-mini']).toBe(vars['--pearl']);
  });
});

describe('ice and sugar', () => {
  const level = (name: string) => ({
    id: name.toLowerCase().replace(/\W+/g, '-'),
    name,
    isDefault: false,
  });

  it('maps the board ice levels to cubes and steam', () => {
    expect(iceCubeCount(level('Warm'))).toBe(0);
    expect(showsSteam(level('Warm'))).toBe(true);
    expect(iceCubeCount(level('No ice'))).toBe(0);
    expect(iceCubeCount(level('Little ice'))).toBe(2);
    expect(iceCubeCount(level('Less ice'))).toBe(3);
    expect(iceCubeCount(level('Standard ice'))).toBe(4);
    expect(icePieces(level('Standard ice')).map((p) => p.key)).toEqual([
      'ice:0',
      'ice:1',
      'ice:2',
      'ice:3',
    ]);
  });

  it('deepens the tea with sugar', () => {
    expect(teaColourMix(level('0%'))).toBe(55);
    expect(teaColourMix(level('50%'))).toBe(78);
    expect(teaColourMix(level('100%'))).toBe(100);
    expect(teaColourMix(level('Regular'))).toBe(100);
  });
});
