import { describe, expect, it } from 'vitest';
import {
  artForTopping,
  capsFor,
  iceCubeCount,
  icePieces,
  liquidTopFor,
  piecesFor,
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
      perLot: 5,
    });
    expect(artForTopping(topping('Mini Pearls'))).toMatchObject({ symbol: 'kt-pearl-mini' });
    expect(artForTopping(topping('Mixed Pearls'))).toMatchObject({
      symbol: 'kt-pearl',
      alt: 'kt-pearl-mini',
    });
    expect(artForTopping(topping('Grass Jelly'))).toMatchObject({
      symbol: 'kt-jelly-cube',
      perLot: 4,
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
    expect(specs).toHaveLength(11);
    expect(specs.filter((s) => s.symbol === 'kt-pearl')).toHaveLength(10);
    expect(specs.find((s) => s.symbol === 'kt-pudding')).toMatchObject({ shape: 'box', size: 30 });
    expect(new Set(specs.map((s) => s.key)).size).toBe(11);
    expect(specs[0]?.key).toBe('boba:0:0');
  });

  it('alternates pearls and mini pearls for mixed pearls', () => {
    const specs = piecesFor([{ topping: topping('Mixed Pearls'), quantity: 1 }]);
    expect(specs.map((s) => s.symbol)).toEqual([
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
      'kt-pearl-mini',
      'kt-pearl',
    ]);
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
