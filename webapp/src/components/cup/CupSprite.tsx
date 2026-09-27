import sprite from '../../assets/art/cup-parts.svg?raw';

/**
 * Puts the cup part library into the document so `<use href="#kt-...">` resolves.
 * Render it once, where a LiveCup can appear (the customise sheet). The file is hidden and inert.
 */
export function CupSprite() {
  return <div aria-hidden="true" hidden dangerouslySetInnerHTML={{ __html: sprite }} />;
}
