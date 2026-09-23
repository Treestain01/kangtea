import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREAKPOINTS } from './breakpoints';

/**
 * Guards the theme contract:
 * - every colour in the app comes from src/theme/tokens.css,
 * - every var(--color-*) reference resolves to a defined token,
 * - every CSS media query uses a documented breakpoint.
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

const excluded = new Set(['theme/tokens.css', 'theme/tokens.test.ts']);

const sourceFiles = walk(srcDir)
  .filter((file) => /\.(css|ts|tsx)$/.test(file))
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

describe('theme tokens', () => {
  it('defines the brand colours', () => {
    expect(tokensCss).toMatch(/--color-brand:\s*#cbc6c3/i);
    expect(tokensCss).toMatch(/--color-accent:\s*#2233c0/i);
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
