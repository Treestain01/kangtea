import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CupSprite } from './CupSprite';
import { LiveCup } from './LiveCup';

const level = (name: string) => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  isDefault: false,
});
const topping = (name: string) => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  priceCents: 100,
});

const uses = (symbol: string) => document.querySelectorAll(`svg.livecup use[href="#${symbol}"]`);

describe('LiveCup', () => {
  it('draws the cup, lid and straw and names itself for assistive tech', () => {
    render(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('Normal ice')} toppings={[]} />,
    );
    expect(screen.getByRole('img', { name: 'Your drink' })).toBeInTheDocument();
    expect(uses('kt-cup-body')).toHaveLength(1);
    expect(uses('kt-straw')).toHaveLength(1);
    expect(uses('kt-steam')).toHaveLength(0);
  });

  it('clips the tea to its own copy of the cup interior', () => {
    render(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('Normal ice')} toppings={[]} />,
    );
    const clipped = document.querySelector('svg.livecup g[clip-path]');
    const id = clipped?.getAttribute('clip-path')?.match(/url\(#(.+)\)/)?.[1];
    expect(id).toBeTruthy();
    const clip = id ? document.getElementById(id) : null;
    expect(clip?.tagName).toBe('clipPath');
    expect(clip?.closest('svg.livecup')).not.toBeNull();
  });

  it('shows steam for a warm drink and no cubes', async () => {
    render(<LiveCup colour="#6B4A3A" sugar={level('50%')} ice={level('Warm')} toppings={[]} />);
    expect(uses('kt-steam')).toHaveLength(1);
    await waitFor(() => expect(uses('kt-ice-cube')).toHaveLength(0));
  });

  it('drops one body per piece once the engine has loaded, and settles them without animation here', async () => {
    render(
      <LiveCup
        colour="#E0912D"
        sugar={level('100%')}
        ice={level('Little ice')}
        toppings={[
          { topping: topping('Boba'), quantity: 2 },
          { topping: topping('Pudding'), quantity: 1 },
        ]}
      />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(20));
    expect(uses('kt-pudding')).toHaveLength(1);
    expect(uses('kt-ice-cube')).toHaveLength(2);
    const firstPearl = uses('kt-pearl')[0];
    expect(firstPearl?.getAttribute('transform')).toMatch(/translate\(/);
  });

  it('paints milk foam as a band sitting exactly on the tea, never overlapping it', async () => {
    const { rerender } = render(
      <LiveCup colour="#9DBA78" sugar={level('100%')} ice={level('No ice')} toppings={[]} />,
    );
    const liquid = () => document.querySelector('svg.livecup .livecup__liquid');
    const band = () => document.querySelector('svg.livecup .livecup__foam');
    // The band is always there so the pour is a transition, not a popped-in element.
    expect(liquid()?.getAttribute('y')).toBe('44');
    expect(band()?.getAttribute('height')).toBe('0');
    rerender(
      <LiveCup
        colour="#9DBA78"
        sugar={level('100%')}
        ice={level('No ice')}
        toppings={[{ topping: topping('Milk Foam'), quantity: 1 }]}
      />,
    );
    // The live cup draws no foam symbol; the band's bottom edge is the tea's top edge.
    expect(uses('kt-foam-cap')).toHaveLength(0);
    expect(band()?.getAttribute('y')).toBe('42');
    expect(band()?.getAttribute('height')).toBe('18');
    expect(liquid()?.getAttribute('y')).toBe('60');
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(0));
  });

  it('expands the same band downward on a second lot, still flush with the tea', () => {
    const foamOf = (quantity: number) => [{ topping: topping('Milk Foam'), quantity }];
    const { rerender } = render(
      <LiveCup colour="#9DBA78" sugar={level('100%')} ice={level('No ice')} toppings={foamOf(1)} />,
    );
    const band = document.querySelector('svg.livecup .livecup__foam');
    rerender(
      <LiveCup colour="#9DBA78" sugar={level('100%')} ice={level('No ice')} toppings={foamOf(2)} />,
    );
    // Same element, taller: top edge fixed, bottom edge on the lowered tea.
    expect(document.querySelector('svg.livecup .livecup__foam')).toBe(band);
    expect(band?.getAttribute('y')).toBe('42');
    expect(band?.getAttribute('height')).toBe('32');
    expect(document.querySelector('svg.livecup .livecup__liquid')?.getAttribute('y')).toBe('74');
  });

  it('removes bodies when a lot is taken away', async () => {
    const two = [{ topping: topping('Boba'), quantity: 2 }];
    const one = [{ topping: topping('Boba'), quantity: 1 }];
    const { rerender } = render(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('No ice')} toppings={two} />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(20));
    rerender(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('No ice')} toppings={one} />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(10));
  });
});

describe('CupSprite', () => {
  it('provides the symbols the cup uses', () => {
    render(<CupSprite />);
    for (const id of ['kt-cup-inner', 'kt-cup-body', 'kt-pearl', 'kt-foam-cap', 'kt-stamp-full']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('is not display none, so clip paths and gradients inside it still resolve', () => {
    render(<CupSprite />);
    const wrapper = document.getElementById('kt-cup-body')?.closest('.cupsprite');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.hasAttribute('hidden')).toBe(false);
  });
});
