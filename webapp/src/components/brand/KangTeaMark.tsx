import { useId, type SVGProps } from 'react';

/** The mark's drawing box. Height is the design unit; width follows this ratio. */
const VIEW_WIDTH = 35;
const VIEW_HEIGHT = 62;

/**
 * Two monoline strokes, 3 units wide, flat ends, rounded corners.
 * Traced from the Kang Tea logo. Kept in sync with public/brand/kangtea-mark.svg.
 */
const STROKE_MAIN =
  'M5 24 V43 A3 3 0 0 0 8 46 H12 A3 3 0 0 1 15 49 V54 A3 3 0 0 0 18 57 H20 A3 3 0 0 0 23 54 V42 ' +
  'A3 3 0 0 0 20 39 H16.5 A3 3 0 0 1 13.5 36 V6.5 A3.75 3.75 0 0 1 21 6.5 V30 ' +
  'A3.5 3.5 0 0 0 24.5 33.5 H28.5 A3.5 3.5 0 0 0 32 30 V15';
const STROKE_SIDE = 'M28 40 H30.5 A3 3 0 0 1 33.5 43 V59';

type KangTeaMarkProps = Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & {
  /** Rendered height in CSS pixels. Width follows the mark's aspect ratio. */
  size?: number;
  /** Accessible name announced for the image. */
  title?: string;
};

/** The Kang Tea (康緹) mark. Inherits its colour from `currentColor`. */
export function KangTeaMark({ size = VIEW_HEIGHT, title = 'Kang Tea', ...rest }: KangTeaMarkProps) {
  const titleId = useId();
  const width = Math.round(((size * VIEW_WIDTH) / VIEW_HEIGHT) * 100) / 100;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`2 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width={width}
      height={size}
      role="img"
      aria-labelledby={titleId}
      {...rest}
    >
      <title id={titleId}>{title}</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="butt"
        strokeLinejoin="round"
      >
        <path d={STROKE_MAIN} />
        <path d={STROKE_SIDE} />
      </g>
    </svg>
  );
}
