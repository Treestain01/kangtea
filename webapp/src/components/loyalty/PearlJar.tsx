import { useEffect, useRef, type CSSProperties } from 'react';
import { weeklyStreak } from '../../lib/streak';
import { useLoyalty } from '../../loyalty/LoyaltyProvider';
import { useOrders } from '../../store/hooks';
import { PRODUCT_COLOURS } from '../cup/cupParts';
import './PearlJar.css';

/** The jar's inside, in its own drawing units. */
const JAR = { left: 22, right: 98, floor: 138, radius: 5, perRow: 8, rowHeight: 9 };
/** More pearls than this are counted, not drawn. */
const DRAWN_MAX = 104;

function slot(index: number): { x: number; y: number } {
  const row = Math.floor(index / JAR.perRow);
  const column = index % JAR.perRow;
  const offset = row % 2 ? JAR.radius : 0;
  return {
    x: JAR.left + JAR.radius + 1 + offset + column * (JAR.radius * 2 - 0.5),
    y: JAR.floor - row * JAR.rowHeight,
  };
}

/**
 * Every pearl ever earned, in a jar beside the current card, with the weekly streak. New pearls
 * drop in as they are earned. Signed in only; nothing renders otherwise.
 */
export function PearlJar() {
  const loyalty = useLoyalty();
  const orders = useOrders();
  const earned = loyalty.state.kind === 'ready' ? loyalty.state.card.earned : null;
  // Pearls beyond the count seen last render drop in.
  const seen = useRef(earned ?? 0);
  useEffect(() => {
    if (earned !== null) seen.current = earned;
  });
  if (earned === null) return null;

  const streak = weeklyStreak(orders);
  const drawn = Math.min(earned, DRAWN_MAX);

  return (
    <section className="jar" aria-labelledby="jar-heading">
      <svg className="jar__glass" viewBox="0 0 120 150" aria-hidden="true">
        <path
          className="jar__body"
          d="M30 14 H90 V26 Q104 32 104 48 V128 Q104 144 88 144 H32 Q16 144 16 128 V48 Q16 32 30 26 Z"
        />
        <rect className="jar__lid" x="34" y="8" width="52" height="10" rx="4" />
        <g style={{ '--pearl': PRODUCT_COLOURS.pearl } as CSSProperties}>
          {Array.from({ length: drawn }, (_, index) => {
            const { x, y } = slot(index);
            const fresh = index >= seen.current;
            return (
              <circle
                key={index}
                className={`jar__pearl${fresh ? ' jar__pearl--new' : ''}`}
                cx={x}
                cy={y}
                r={JAR.radius}
                style={
                  fresh
                    ? ({ '--delay': `${(index - seen.current) * 60}ms` } as CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </g>
      </svg>
      <div className="jar__text">
        <h3 id="jar-heading" className="jar__heading">
          Pearl jar
        </h3>
        <p className="jar__count">
          <strong>{earned}</strong> {earned === 1 ? 'pearl' : 'pearls'}
        </p>
        <p className="jar__copy">
          Every pearl you have earned, beside the card you are filling now.
        </p>
        {streak >= 2 && <p className="jar__streak">{streak} weeks running</p>}
      </div>
    </section>
  );
}
