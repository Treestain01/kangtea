import type { ReactNode } from 'react';
import { PRODUCT_COLOURS } from './cupParts';
import { StaticCup } from './StaticCup';
import './Loading.css';

type LoadingProps = {
  /** What is being waited for, for example "Loading the menu". Announced as a status. */
  children: ReactNode;
};

/** A cup pouring itself, over and over, while something loads. */
export function Loading({ children }: LoadingProps) {
  return (
    <p className="loading" role="status">
      <span className="loading__cup">
        <StaticCup colour={PRODUCT_COLOURS.tea} lid={false} pouring />
      </span>
      <span>{children}</span>
    </p>
  );
}
