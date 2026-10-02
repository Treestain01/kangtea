import { describe, expect, it } from 'vitest';
import { CUP, type PieceSpec } from './cupParts';
import { createCupWorld } from './cupPhysics';

/** A fixed sequence so the tests are repeatable. */
function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const pearl = (n: number): PieceSpec => ({
  key: `boba:0:${n}`,
  symbol: 'kt-pearl',
  size: 14,
  shape: 'circle',
  kind: 'sink',
});
const cube = (n: number): PieceSpec => ({
  key: `ice:${n}`,
  symbol: 'kt-ice-cube',
  size: 18,
  shape: 'box',
  kind: 'ice',
});

describe('createCupWorld', () => {
  it('drops pearls to the bottom of the cup, inside the walls', () => {
    const world = createCupWorld(seeded());
    world.sync([0, 1, 2, 3, 4].map(pearl));
    world.settle();
    for (const { body } of world.pieces()) {
      expect(body.position.y).toBeGreaterThan(150);
      expect(body.position.y).toBeLessThan(CUP.height);
      expect(body.position.x).toBeGreaterThan(26);
      expect(body.position.x).toBeLessThan(94);
    }
    world.destroy();
  });

  it('floats ice fully under the surface', () => {
    const world = createCupWorld(seeded(3));
    world.setLiquidTop(CUP.liquidTop);
    world.sync([0, 1, 2, 3].map(cube));
    world.settle();
    for (const { body, spec } of world.pieces()) {
      const top = body.position.y - spec.size / 2;
      expect(top).toBeGreaterThanOrEqual(CUP.liquidTop - 1);
      expect(top).toBeLessThan(CUP.liquidTop + 20);
    }
    world.destroy();
  });

  it('keeps ice under a lowered surface too', () => {
    const world = createCupWorld(seeded(5));
    world.setLiquidTop(60);
    world.sync([0, 1].map(cube));
    world.settle();
    for (const { body, spec } of world.pieces()) {
      expect(body.position.y - spec.size / 2).toBeGreaterThanOrEqual(59);
    }
    world.destroy();
  });

  it('adds and removes bodies by key without touching the rest', () => {
    const world = createCupWorld(seeded());
    const first = world.sync([pearl(0), pearl(1)]);
    expect(first.added).toHaveLength(2);
    const second = world.sync([pearl(1), pearl(2)]);
    expect(second.added.map((p) => p.spec.key)).toEqual(['boba:0:2']);
    expect(second.removed.map((p) => p.spec.key)).toEqual(['boba:0:0']);
    expect(
      world
        .pieces()
        .map((p) => p.spec.key)
        .sort(),
    ).toEqual(['boba:0:1', 'boba:0:2']);
    world.destroy();
  });

  it('gets a pearl to the bottom in about a second and a half', () => {
    const world = createCupWorld(seeded(11));
    world.sync([pearl(0)]);
    for (let i = 0; i < 90; i += 1) world.step(); // 90 frames, 1.5s
    expect(world.pieces()[0]?.body.position.y).toBeGreaterThan(170);
    world.destroy();
  });

  it('falls fast through the air and slows once it is in the tea', () => {
    const world = createCupWorld(seeded(11));
    world.sync([pearl(0)]);
    const body = () => world.pieces()[0]!.body;
    let fastest = 0;
    while (body().position.y < 44) {
      world.step();
      fastest = Math.max(fastest, body().velocity.y);
    }
    // Well under the surface and before the floor, it is moving at a fraction of its entry speed.
    while (body().position.y < 120) world.step();
    const inTea = body().velocity.y;
    expect(fastest).toBeGreaterThan(4);
    expect(inTea).toBeLessThan(fastest / 2);
    expect(inTea).toBeGreaterThan(0.5);
    world.destroy();
  });
});
