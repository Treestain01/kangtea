import type { CSSProperties } from 'react';
import { KangTeaMark } from './KangTeaMark';
import './brand.css';

type KangTeaLogoProps = {
  /** `full` stacks the mark, the KANGTEA wordmark and 康緹. `mark` renders the mark alone. */
  variant?: 'full' | 'mark';
  /** Height of the mark in CSS pixels. The wordmark scales with it. */
  size?: number;
  className?: string;
};

/** The Kang Tea logo lockup. Colour comes from `--color-accent` unless a parent sets `color`. */
export function KangTeaLogo({ variant = 'full', size = 62, className }: KangTeaLogoProps) {
  if (variant === 'mark') {
    return <KangTeaMark size={size} className={className} />;
  }

  const style = { '--brand-size': `${size}px` } as CSSProperties;
  const classes = ['brand-logo', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      <KangTeaMark size={size} />
      {/* The mark already carries the accessible name; the text is visual reinforcement. */}
      <span className="brand-logo__wordmark" aria-hidden="true">
        KANGTEA
      </span>
      <span className="brand-logo__cjk" aria-hidden="true" lang="zh-Hant">
        康緹
      </span>
    </div>
  );
}
