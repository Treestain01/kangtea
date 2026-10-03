import type { Garnish, OptionLevel } from '@bbt/shared';
import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import type { ToppingChoice } from '../../store/lines';
import {
  CUP,
  FRAME_MS,
  PRODUCT_COLOURS,
  capsFor,
  foamBandFor,
  icePieces,
  liquidTopFor,
  piecesFor,
  productColourVars,
  showsSteam,
  teaColourMix,
  wallPiecesFor,
  type PieceSpec,
} from './cupParts';
import type { CupWorld, LivePiece } from './cupPhysics';
import './LiveCup.css';

type LiveCupProps = {
  /** The drink colour from the menu. */
  colour: string;
  sugar: OptionLevel;
  ice: OptionLevel;
  toppings: readonly ToppingChoice[];
  /** Slices the drink innately comes with (`MenuItem.garnish`); not a topping, never removable. */
  garnish?: Garnish;
  /** Accessible description of the cup; the visible readout lives elsewhere in the sheet. */
  label?: string;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Motion is off when the person asked for it, and in environments without matchMedia (tests). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The pour duration from the theme (`--motion-pour`), read off a live element so the physics
 * surface falls exactly as fast as the painted tea. Zero wherever styles do not resolve (tests).
 */
function pourDurationMs(from: Element | null): number {
  if (!from || typeof getComputedStyle !== 'function') return 0;
  const raw = getComputedStyle(from).getPropertyValue('--motion-pour').trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

/**
 * The cup that builds itself while a drink is customised. Sugar deepens the tea, ice floats under the
 * surface, foam and brulee fade in on top, and every other topping drops in and piles at the bottom.
 * Toppings and ice are bodies in `cupPhysics`, loaded on demand so Matter.js only ships with the sheet.
 */
export function LiveCup({
  colour,
  sugar,
  ice,
  toppings,
  garnish,
  label = 'Your drink',
}: LiveCupProps) {
  const pieceLayer = useRef<SVGGElement>(null);
  const worldRef = useRef<CupWorld | null>(null);
  const nodes = useRef(new Map<string, SVGUseElement>());
  const specsRef = useRef<PieceSpec[]>([]);
  const previousCaps = useRef<string[]>([]);
  const reduced = useMemo(prefersReducedMotion, []);
  // The cup owns its clip so the tea is trimmed to the walls even if the sprite is elsewhere.
  const clipId = useId();

  const allCaps = capsFor(toppings);
  const liquidTop = liquidTopFor(allCaps);
  // Foam is drawn as a band of rects flush with the tea, not as a symbol; see foamBandFor.
  const foamThickness = foamBandFor(allCaps);
  const caps = allCaps.filter((cap) => cap.symbol !== 'kt-foam-cap');
  const wallSlices = wallPiecesFor(toppings, garnish);
  const specs = useMemo(() => [...piecesFor(toppings), ...icePieces(ice)], [toppings, ice]);
  specsRef.current = specs;

  const paint = (pieces: readonly LivePiece[]) => {
    for (const { spec, body } of pieces) {
      const node = nodes.current.get(spec.key);
      if (!node) continue;
      const half = spec.size / 2;
      node.setAttribute(
        'transform',
        `translate(${body.position.x.toFixed(2)} ${body.position.y.toFixed(2)}) rotate(${((body.angle * 180) / Math.PI).toFixed(1)}) translate(${-half} ${-half})`,
      );
    }
  };

  const applySpecs = (world: CupWorld) => {
    const layer = pieceLayer.current;
    if (!layer) return;
    const { added, removed } = world.sync(specsRef.current);
    for (const { spec } of removed) {
      nodes.current.get(spec.key)?.remove();
      nodes.current.delete(spec.key);
    }
    for (const { spec } of added) {
      const node = document.createElementNS(SVG_NS, 'use');
      node.setAttribute('href', `#${spec.symbol}`);
      node.setAttribute('width', String(spec.size));
      node.setAttribute('height', String(spec.size));
      if (spec.tint) {
        node.style.setProperty('--jelly', spec.tint);
        node.style.setProperty('--popping', spec.tint);
      }
      layer.appendChild(node);
      nodes.current.set(spec.key, node);
    }
    if (reduced) {
      world.settle();
      paint(world.pieces());
    }
  };

  // Create the world once, after the engine has loaded, then run it until unmount.
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const nodeMap = nodes.current;
    void import('./cupPhysics').then(({ createCupWorld }) => {
      if (cancelled) return;
      const world = createCupWorld();
      worldRef.current = world;
      world.setLiquidTop(liquidTop);
      applySpecs(world);
      if (!reduced) {
        // Fixed timestep: real time accumulates and the world advances in whole frames,
        // at most three per animation frame so a background tab does not catch up in one burst.
        let last = performance.now();
        let owed = 0;
        const tick = (now: number) => {
          owed = Math.min(owed + (now - last), FRAME_MS * 3);
          last = now;
          while (owed >= FRAME_MS) {
            world.step();
            owed -= FRAME_MS;
          }
          paint(world.pieces());
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      worldRef.current?.destroy();
      worldRef.current = null;
      nodeMap.forEach((node) => node.remove());
      nodeMap.clear();
    };
    // The world outlives prop changes; the effects below feed it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    // The surface eases down over the same duration as the tea's transition, so the foam pushes
    // the floating ice ahead of it instead of the ice dropping to the final line at once.
    world.setLiquidTop(liquidTop, reduced ? 0 : pourDurationMs(pieceLayer.current));
    applySpecs(world);
    // applySpecs reads specsRef, which is refreshed every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs, liquidTop]);

  // Caps that were not there on the previous render fade in.
  const newCaps = caps.filter((cap) => !previousCaps.current.includes(cap.symbol));
  useEffect(() => {
    previousCaps.current = caps.map((cap) => cap.symbol);
  });

  const style = {
    '--tea': `color-mix(in srgb, ${colour} ${teaColourMix(sugar)}%, ${PRODUCT_COLOURS.coconutJelly})`,
    ...productColourVars(),
  } as CSSProperties;

  return (
    <svg className="livecup" viewBox={CUP.viewBox} style={style} role="img" aria-label={label}>
      <defs>
        <clipPath id={clipId}>
          <path d={CUP.innerPath} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="livecup__liquid"
          x="18"
          y={liquidTop}
          width="84"
          height={CUP.height - liquidTop}
          fill="var(--tea)"
        />
        <use href="#kt-tea-sheen" width={CUP.width} height={CUP.height} />
        {/* Slices lean on the walls behind the moving pieces; they are never physics bodies. */}
        <g data-layer="slices">
          {wallSlices.map((slice) => (
            <use
              key={slice.key}
              href={`#${slice.symbol}`}
              x={slice.x}
              y={slice.y}
              width={slice.size}
              height={slice.size}
              className="livecup__slice"
            />
          ))}
        </g>
        <g ref={pieceLayer} data-layer="pieces" />
        <g data-layer="caps">
          {caps.map((cap) => (
            <use
              key={cap.symbol}
              href={`#${cap.symbol}`}
              x={cap.x}
              y={liquidTop - cap.surfaceLine}
              width={cap.width}
              height={cap.height}
              className={newCaps.includes(cap) ? 'livecup__cap--new' : undefined}
            />
          ))}
        </g>
        {/* The foam band is always in the tree so pouring, growing and draining are one y/height
            transition in lockstep with the liquid: its bottom edge is always the tea's top edge. */}
        <g
          data-layer="foam"
          className={`livecup__foamband${foamThickness === 0 ? ' livecup__foamband--empty' : ''}`}
        >
          <rect
            className="livecup__foam"
            x="18"
            y={liquidTop - foamThickness}
            width="84"
            height={foamThickness}
          />
          <rect
            className="livecup__foam-line"
            x="18"
            y={liquidTop - foamThickness}
            width="84"
            height="1.5"
          />
          <rect
            className="livecup__foam-gloss"
            x="26"
            y={liquidTop - foamThickness + 4}
            width="30"
            height="4"
            rx="2"
          />
        </g>
      </g>
      <use href="#kt-cup-body" width={CUP.width} height={CUP.height} />
      <use href="#kt-cup-lid" width={CUP.width} height={CUP.height} />
      {showsSteam(ice) && <use href="#kt-steam" width={CUP.width} height={CUP.height} />}
      <use href="#kt-straw" width={CUP.width} height={CUP.height} />
    </svg>
  );
}
