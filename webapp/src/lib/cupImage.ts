/**
 * Turns a cup drawn on the page into a PNG for sharing. The cup's svg references symbols in the
 * sprite and takes its colours from CSS variables, so the copy inlines both before it is drawn.
 * Returns null wherever the pieces are missing (no canvas, no sprite, a browser that will not load
 * the image), so a share without a picture still goes ahead.
 */

const CUP_VARIABLES = [
  '--tea',
  '--cup-line',
  '--cup-surface',
  '--straw',
  '--pearl',
  '--pearl-mini',
  '--foam',
  '--ice',
  '--brulee',
  '--pudding',
  '--taro',
  '--jelly',
  '--popping',
];

const CARD = { width: 1080, height: 1080, padding: 96, radius: 64 };

export type CupImageText = {
  brand: string;
  name: string;
  details: string;
};

/** Copies every `#id` the node refers to (symbols, clip paths, gradients) from the document into `defs`. */
function inlineReferences(node: Element, defs: SVGDefsElement, copied: Set<string>): void {
  const ids = new Set<string>();
  for (const use of node.querySelectorAll('use')) {
    const href = use.getAttribute('href') ?? use.getAttribute('xlink:href') ?? '';
    if (href.startsWith('#')) ids.add(href.slice(1));
  }
  for (const match of node.outerHTML.matchAll(/url\(#([\w-]+)\)/g)) ids.add(match[1] ?? '');
  for (const id of ids) {
    if (!id || copied.has(id)) continue;
    const source = document.getElementById(id);
    if (!source || node.contains(source)) continue;
    copied.add(id);
    const copy = source.cloneNode(true) as Element;
    defs.appendChild(copy);
    inlineReferences(copy, defs, copied);
  }
}

/** A standalone svg string for the cup, with its sprite parts and colours baked in. */
export function standaloneCupSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.removeAttribute('class');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');
  const computed = getComputedStyle(svg);
  for (const name of CUP_VARIABLES) {
    const value = computed.getPropertyValue(name).trim();
    if (value) clone.style.setProperty(name, value);
  }
  clone.style.color = computed.color;
  // Animations and transitions would leave the copy mid-motion.
  for (const element of [clone, ...clone.querySelectorAll('*')]) {
    element.removeAttribute('class');
  }
  let defs = clone.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    clone.insertBefore(defs, clone.firstChild);
  }
  inlineReferences(clone, defs, new Set());
  return new XMLSerializer().serializeToString(clone);
}

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Lines of `text` that fit `maxWidth`, greedy by word. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A square card: the cup on the left, the brand, drink and choices on the right, on the accent
 * colour read from the page so it matches the theme the person is looking at.
 */
export async function renderCupImage(
  svg: SVGSVGElement,
  text: CupImageText,
  fileName = 'kang-tea-drink.png',
): Promise<File | null> {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const markup = standaloneCupSvg(svg);
  const cup = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
  if (!cup) return null;

  const root = getComputedStyle(document.documentElement);
  const accent = root.getPropertyValue('--color-accent').trim();
  const onAccent = root.getPropertyValue('--color-on-accent').trim();
  const display = root.getPropertyValue('--font-display').trim() || 'serif';
  const body = root.getPropertyValue('--font-body').trim() || 'sans-serif';

  ctx.fillStyle = accent;
  roundedRect(ctx, 0, 0, CARD.width, CARD.height, CARD.radius);
  ctx.fill();

  // The cup: 120 by 214 units, scaled to the card's height inside the padding.
  const cupHeight = CARD.height - CARD.padding * 2;
  const cupWidth = (cupHeight * 120) / 214;
  ctx.drawImage(cup, CARD.padding, CARD.padding, cupWidth, cupHeight);

  const textX = CARD.padding * 1.5 + cupWidth;
  const textWidth = CARD.width - textX - CARD.padding;
  ctx.fillStyle = onAccent;
  ctx.textBaseline = 'top';
  ctx.font = `600 36px ${display}`;
  ctx.fillText(text.brand, textX, CARD.padding + 8);
  ctx.font = `600 72px ${display}`;
  let y = CARD.padding + 96;
  for (const line of wrap(ctx, text.name, textWidth)) {
    ctx.fillText(line, textX, y);
    y += 84;
  }
  ctx.font = `400 40px ${body}`;
  y += 24;
  for (const line of wrap(ctx, text.details, textWidth)) {
    ctx.fillText(line, textX, y);
    y += 52;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? new File([blob], fileName, { type: 'image/png' }) : null;
}
