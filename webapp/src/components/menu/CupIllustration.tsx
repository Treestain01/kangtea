import type { CSSProperties } from 'react';
import './menu.css';

type CupIllustrationProps = {
  /** Tea colour from the menu item. Product content, not a UI token. */
  colour: string;
  pearls: boolean;
  /** Height in CSS pixels. */
  size?: number;
};

/** Decorative cup drawn in CSS so every drink has an image without any assets. */
export function CupIllustration({ colour, pearls, size = 72 }: CupIllustrationProps) {
  const style = { '--tea': colour, '--cup-size': `${size}px` } as CSSProperties;
  const className = ['cup', pearls ? 'cup--pearls' : ''].filter(Boolean).join(' ');
  return (
    <div className={className} style={style} aria-hidden="true" data-testid="cup">
      <span className="cup__straw" />
      <span className="cup__lid" />
      <span className="cup__body" />
    </div>
  );
}
