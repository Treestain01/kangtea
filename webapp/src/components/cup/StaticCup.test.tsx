import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaticCup } from './StaticCup';

const uses = (symbol: string) => document.querySelectorAll(`svg.staticcup use[href="#${symbol}"]`);
const liquid = () => document.querySelector('svg.staticcup .staticcup__liquid') as SVGRectElement;

describe('StaticCup', () => {
  it('is decorative unless given a label', () => {
    const { rerender } = render(<StaticCup colour="#B07A45" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<StaticCup colour="#B07A45" label="Signature Milk Tea" />);
    expect(screen.getByRole('img', { name: 'Signature Milk Tea' })).toBeInTheDocument();
  });

  it('draws a plain drink full with its lid on and nothing inside', () => {
    render(<StaticCup colour="#B07A45" />);
    expect(uses('kt-cup-body')).toHaveLength(1);
    expect(uses('kt-cup-lid')[0]).not.toHaveClass('staticcup__lid--off');
    expect(uses('kt-pearl')).toHaveLength(0);
    expect(liquid().getAttribute('y')).toBe('44');
  });

  it('adds pearls for a drink the menu says comes with them', () => {
    render(<StaticCup colour="#B07A45" pearls />);
    expect(uses('kt-pearl').length).toBeGreaterThanOrEqual(5);
  });

  it('draws the line choices: sugar tints, ice floats, toppings pile and caps sit on top', () => {
    render(
      <StaticCup
        colour="#B07A45"
        customisations={[
          { name: 'Sugar', value: '0%' },
          { name: 'Ice', value: 'Less ice' },
          { name: 'Topping', value: 'Boba', quantity: 2 },
          { name: 'Topping', value: 'Milk Foam' },
        ]}
      />,
    );
    const svg = document.querySelector('svg.staticcup') as SVGSVGElement;
    expect(svg.style.getPropertyValue('--tea')).toContain('55%');
    expect(uses('kt-ice-cube')).toHaveLength(2);
    expect(uses('kt-pearl')).toHaveLength(10);
    expect(uses('kt-foam-cap')).toHaveLength(1);
    // Foam lowers the tea by its own thickness.
    expect(liquid().getAttribute('y')).toBe('60');
  });

  it('shows steam for a warm drink', () => {
    render(<StaticCup colour="#6B4A3A" customisations={[{ name: 'Ice', value: 'Warm' }]} />);
    expect(uses('kt-steam')).toHaveLength(1);
  });

  it('pours from empty: level 0 is an empty cup with no pieces, lid off is lifted away', () => {
    const { rerender } = render(<StaticCup colour="#B07A45" pearls level={0} lid={false} />);
    expect(Number(liquid().getAttribute('y'))).toBe(200);
    expect(uses('kt-pearl')).toHaveLength(0);
    expect(uses('kt-cup-lid')[0]).toHaveClass('staticcup__lid--off');
    rerender(<StaticCup colour="#B07A45" pearls level={1} lid drop />);
    expect(liquid().getAttribute('y')).toBe('44');
    expect(uses('kt-pearl')[0]).toHaveClass('staticcup__piece--drop');
  });

  it('never draws more than a dozen pieces', () => {
    render(
      <StaticCup
        colour="#B07A45"
        customisations={[
          { name: 'Topping', value: 'Boba', quantity: 3 },
          { name: 'Topping', value: 'Mini Pearls', quantity: 3 },
        ]}
      />,
    );
    expect(uses('kt-pearl').length + uses('kt-pearl-mini').length).toBe(12);
  });
});
