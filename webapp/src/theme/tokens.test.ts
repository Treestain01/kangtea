import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREAKPOINTS } from './breakpoints';

/**
 * Guards the theme contract:
 * - every colour in the app comes from src/theme/tokens.css,
 * - every var(--color-*) reference resolves to a defined token,
 * - every CSS media query uses a documented breakpoint,
 * - the dark palette is written once for the system and once for the explicit choice, identically,
 * - no stylesheet outside tokens.css checks the colour scheme itself.
 */

// Vitest runs with the package directory as cwd. import.meta.url is an http URL under jsdom.
const srcDir = join(process.cwd(), 'src');
const tokensPath = join(srcDir, 'theme', 'tokens.css');
const tokensCss = readFileSync(tokensPath, 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Test files and the test fixture module are skipped: their fixtures carry drink tints as data.
const excluded = new Set(['theme/tokens.css', 'store/testing.ts']);

const sourceFiles = walk(srcDir)
  .filter((file) => /\.(css|ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file))
  .map((file) => ({
    path: relative(srcDir, file).replace(/\\/g, '/'),
    text: readFileSync(file, 'utf8'),
  }))
  .filter((file) => !excluded.has(file.path));

const cssFiles = sourceFiles.filter((file) => file.path.endsWith('.css'));

const hexColour = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi;
const functionalColour = /\b(?:rgb|hsl)a?\(/gi;
const namedColourValue =
  /:\s*(?:white|black|red|blue|green|gray|grey|orange|yellow|purple|pink|silver|navy|teal)\b/gi;

/** The declarations inside the first `selector { ... }` block, one per line, trimmed. */
function declarationsOf(css: string, selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block missing from tokens.css`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css
    .slice(open + 1, close)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

describe('theme tokens', () => {
  it('defines the brand colours', () => {
    expect(tokensCss).toMatch(/--color-brand:\s*#cbc6c3/i);
    expect(tokensCss).toMatch(/--color-accent:\s*#084986/i);
  });

  it('is the only place colours are written literally', () => {
    const offenders = sourceFiles.flatMap((file) => {
      const hits = [
        ...(file.text.match(hexColour) ?? []),
        ...(file.text.match(functionalColour) ?? []),
        ...(file.path.endsWith('.css') ? (file.text.match(namedColourValue) ?? []) : []),
      ];
      return hits.map((hit) => `${file.path}: ${hit.trim()}`);
    });
    expect(offenders, 'use var(--color-*) from src/theme/tokens.css instead').toEqual([]);
  });

  it('only references colour tokens that exist', () => {
    const defined = new Set([...tokensCss.matchAll(/(--color-[\w-]+)\s*:/g)].map((m) => m[1]));
    const referenced = sourceFiles.flatMap((file) =>
      [...file.text.matchAll(/var\((--color-[\w-]+)/g)].map((m) => `${file.path}: ${m[1]}`),
    );
    const unknown = referenced.filter((entry) => !defined.has(entry.split(': ')[1] ?? ''));
    expect(unknown, 'undefined token referenced').toEqual([]);
  });

  it('writes the dark palette identically for the system default and the explicit choice', () => {
    const system = declarationsOf(tokensCss, ":root:not([data-theme='light'])");
    const chosen = declarationsOf(tokensCss, ":root[data-theme='dark']");
    expect(system.length).toBeGreaterThan(5);
    expect(chosen).toEqual(system);
  });

  it('overrides every light colour token in the dark palette', () => {
    const light = declarationsOf(tokensCss, ':root')
      .map((line) => line.match(/^(--color-[\w-]+):/)?.[1])
      .filter((name): name is string => name !== undefined && name !== '--color-brand');
    const dark = new Set(
      declarationsOf(tokensCss, ":root[data-theme='dark']").map(
        (line) => line.match(/^(--color-[\w-]+):/)?.[1],
      ),
    );
    const missing = light.filter((name) => !dark.has(name));
    expect(missing, 'every colour token except the brand grey needs a dark value').toEqual([]);
  });

  it('leaves colour scheme detection to tokens.css', () => {
    const offenders = cssFiles
      .filter((file) => /prefers-color-scheme|data-theme/.test(file.text))
      .map((file) => file.path);
    expect(offenders, 'components read tokens; only tokens.css switches palettes').toEqual([]);
  });

  it('takes every transition and animation timing from the motion tokens', () => {
    const literalTiming =
      /\b\d+m?s\b|cubic-bezier\(|\b(?:ease|ease-in|ease-out|ease-in-out|linear)\b/;
    const offenders = cssFiles.flatMap((file) =>
      file.text
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(
          ({ line }) =>
            /\b(?:transition|animation)\b/.test(line) || /^\s+[\w-]+\s+\d+m?s\b/.test(line),
        )
        .filter(
          ({ line }) => literalTiming.test(line) && !/var\(--motion-|var\(--ease\)/.test(line),
        )
        .map(({ number, line }) => `${file.path}:${number}: ${line.trim()}`),
    );
    expect(offenders, 'use var(--motion-fast|slow) var(--ease) from tokens.css').toEqual([]);
  });

  it('keeps surfaces flat: the only box shadow is the floating sheet token', () => {
    const offenders = cssFiles.flatMap((file) =>
      file.text
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => /box-shadow\s*:/.test(line))
        .filter(({ line }) => !/box-shadow\s*:\s*(?:var\(--shadow-float\)|none)\s*;/.test(line))
        .map(({ number, line }) => `${file.path}:${number}: ${line.trim()}`),
    );
    expect(offenders, 'surfaces use 1px var(--color-border), not shadows').toEqual([]);
  });

  it('uses only documented breakpoints in media queries', () => {
    const allowed = new Set<number>(Object.values(BREAKPOINTS));
    const offenders = cssFiles.flatMap((file) =>
      [...file.text.matchAll(/@media[^{]*\((?:min|max)-width:\s*([\d.]+)(px|rem|em)\)/g)]
        .map((m) => {
          const value = Number(m[1]);
          const px = m[2] === 'px' ? value : value * 16;
          return { file: file.path, px };
        })
        .filter(({ px }) => !allowed.has(px))
        .map(({ file, px }) => `${file}: ${px}px`),
    );
    expect(offenders, `breakpoints must be one of ${[...allowed].join(', ')}px`).toEqual([]);
  });
});
