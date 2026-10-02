import Matter from 'matter-js';
import { CUP, FRAME_MS, type PieceSpec } from './cupParts';

/**
 * A small rigid body world shaped like the inside of the cup. Pieces fall in from above the lid,
 * ice is pushed up to float fully under the surface, everything else sinks and piles.
 * Framework free: LiveCup owns the SVG and reads positions from here each frame.
 *
 * Loaded on demand (`import('./cupPhysics')`) so Matter.js ships only with the customise sheet.
 */

export interface LivePiece {
  spec: PieceSpec;
  body: Matter.Body;
  /** The body's air drag above the tea; it thickens once the piece is under the surface. */
  airAbove: number;
}

export interface CupWorld {
  /** Adds bodies for new specs, removes bodies whose specs are gone. Returns what changed. */
  sync(specs: readonly PieceSpec[]): { added: LivePiece[]; removed: LivePiece[] };
  setLiquidTop(y: number): void;
  /** Advances the world by one fixed frame (`FRAME_MS`). */
  step(): void;
  /** Steps until the pieces have come to rest, for reduced motion and tests. */
  settle(): void;
  pieces(): readonly LivePiece[];
  destroy(): void;
}

// Collision groups: each kind collides with the cup and its own kind only, so pearls fall past the ice.
const GROUP = { cup: 0x1, sink: 0x2, ice: 0x4 } as const;

/** Tuned in the Cup Lab: a pearl clears the lid in about 300ms and reaches the bottom in about 800ms. */
const GRAVITY_SCALE = 0.0011;
/** Units per frame. Well under the 24 unit walls and 40 unit floor. */
const MAX_SPEED = 14;
/** A sinking piece under the surface: thicker air and a share of its weight held up, so it slows as it enters the tea. */
const LIQUID_DRAG = 0.085;
const LIQUID_BUOYANCY = 0.42;
const LIQUID_MAX_SPEED = 4;

export function createCupWorld(random: () => number = Math.random): CupWorld {
  const engine = Matter.Engine.create();
  engine.gravity.y = 1;
  engine.gravity.scale = GRAVITY_SCALE;
  const world = engine.world;
  let liquidTop: number = CUP.liquidTop;
  let live: LivePiece[] = [];
  /** Keeps marching across batches, so a lot added right after another does not land on top of it. */
  let nextSlot = 0;

  // Walls are 24 thick and the floor 40, with their inner faces on the cup outline, so a piece that
  // gets a hard shove from a neighbour cannot pass through them in one frame.
  const wall = (x1: number, y1: number, x2: number, y2: number) =>
    Matter.Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1), 24, {
      isStatic: true,
      angle: Math.atan2(y2 - y1, x2 - x1),
      friction: 0.25,
      collisionFilter: { category: GROUP.cup, mask: 0xffff },
    });
  Matter.Composite.add(world, [
    wall(6, 20, 17, 200),
    wall(114, 20, 103, 200),
    Matter.Bodies.rectangle(60, 214, 110, 40, {
      isStatic: true,
      friction: 0.4,
      collisionFilter: { category: GROUP.cup, mask: 0xffff },
    }),
  ]);

  const spawn = (spec: PieceSpec): LivePiece => {
    // Slots march across the cup mouth and stack upwards in four rows, so pieces added together,
    // or in quick succession, never start overlapping.
    const slot = nextSlot % 16;
    nextSlot += 1;
    const x = 40 + ((slot * 13) % 40) + (random() - 0.5) * 4;
    const y = -14 - Math.floor(slot / 4) * 22 - random() * 4;
    const category = spec.kind === 'ice' ? GROUP.ice : GROUP.sink;
    const options: Matter.IChamferableBodyDefinition = {
      restitution: spec.kind === 'ice' ? 0.05 : spec.size >= 30 ? 0.06 : 0.12,
      friction: spec.kind === 'ice' ? 0.1 : spec.size >= 30 ? 0.5 : 0.35,
      frictionAir: spec.kind === 'ice' ? 0.18 : spec.size >= 30 ? 0.015 : 0.012,
      density: spec.kind === 'ice' ? 0.0009 : spec.size >= 30 ? 0.0025 : 0.002,
      collisionFilter: { category, mask: GROUP.cup | category },
    };
    const body =
      spec.shape === 'circle'
        ? Matter.Bodies.circle(x, y, spec.size / 2, options)
        : Matter.Bodies.rectangle(x, y, spec.size, spec.size, {
            ...options,
            chamfer: { radius: spec.size * 0.22 },
          });
    Matter.Body.setAngularVelocity(body, (random() - 0.5) * 0.2);
    Matter.Composite.add(world, body);
    return { spec, body, airAbove: options.frictionAir ?? 0.012 };
  };

  // Cap speed so a hard shove from a neighbour can never carry a piece through a wall in one frame.
  // Sinking pieces fall freely until they meet the tea, then thicker drag and partial buoyancy slow
  // them so they settle rather than drop. Ice is held with its top edge about 3 units under the surface.
  Matter.Events.on(engine, 'beforeUpdate', () => {
    for (const { spec, body, airAbove } of live) {
      const depth = body.position.y - liquidTop;
      const inLiquid = depth > 0;
      const maxSpeed = spec.kind !== 'ice' && inLiquid ? LIQUID_MAX_SPEED : MAX_SPEED;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        Matter.Body.setVelocity(body, { x: body.velocity.x * scale, y: body.velocity.y * scale });
      }
      if (spec.kind !== 'ice') {
        body.frictionAir = inLiquid ? LIQUID_DRAG : airAbove;
        if (inLiquid) {
          const weight = body.mass * engine.gravity.y * engine.gravity.scale;
          Matter.Body.applyForce(body, body.position, { x: 0, y: -weight * LIQUID_BUOYANCY });
        }
        continue;
      }
      if (depth <= -spec.size) continue;
      const weight = body.mass * engine.gravity.y * engine.gravity.scale;
      const factor = Math.max(0, 1 + (depth - (spec.size / 2 + 3)) * 0.1);
      Matter.Body.applyForce(body, body.position, { x: 0, y: -weight * factor });
      Matter.Body.applyForce(body, body.position, { x: (random() - 0.5) * weight * 0.15, y: 0 });
    }
  });

  return {
    sync(specs) {
      const wanted = new Map(specs.map((spec) => [spec.key, spec]));
      const removed = live.filter((piece) => !wanted.has(piece.spec.key));
      for (const piece of removed) Matter.Composite.remove(world, piece.body);
      live = live.filter((piece) => wanted.has(piece.spec.key));
      const have = new Set(live.map((piece) => piece.spec.key));
      const added = specs.filter((spec) => !have.has(spec.key)).map(spawn);
      live = [...live, ...added];
      return { added, removed };
    },
    setLiquidTop(y) {
      liquidTop = y;
    },
    step() {
      Matter.Engine.update(engine, FRAME_MS);
    },
    settle() {
      for (let i = 0; i < 400; i += 1) Matter.Engine.update(engine, FRAME_MS);
    },
    pieces() {
      return live;
    },
    destroy() {
      Matter.Events.off(engine, 'beforeUpdate');
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
      live = [];
    },
  };
}
