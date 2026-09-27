import sprite from '../../assets/art/cup-parts.svg?raw';
import './CupSprite.css';

/**
 * Puts the cup part library into the document so `<use href="#kt-...">` resolves.
 * Render it once, where a LiveCup can appear (the customise sheet).
 * The wrapper is zero sized rather than `hidden`: a clip path or gradient defined inside a
 * `display: none` subtree is ignored by the browser, and the cup's sheen lives in this file.
 */
export function CupSprite() {
  return (
    <div className="cupsprite" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />
  );
}
