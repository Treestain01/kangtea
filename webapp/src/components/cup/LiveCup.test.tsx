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
        ice={level('Less ice')}
        toppings={[
          { topping: topping('Boba'), quantity: 2 },
          { topping: topping('Pudding'), quantity: 1 },
        ]}
      />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(10));
    expect(uses('kt-pudding')).toHaveLength(1);
    expect(uses('kt-ice-cube')).toHaveLength(2);
    const firstPearl = uses('kt-pearl')[0];
    expect(firstPearl?.getAttribute('transform')).toMatch(/translate\(/);
  });

  it('paints milk foam on the surface and lowers the tea', async () => {
    const { rerender } = render(
      <LiveCup colour="#9DBA78" sugar={level('100%')} ice={level('No ice')} toppings={[]} />,
    );
    const liquid = () => document.querySelector('svg.livecup .livecup__liquid');
    expect(liquid()?.getAttribute('y')).toBe('44');
    rerender(
      <LiveCup
        colour="#9DBA78"
        sugar={level('100%')}
        ice={level('No ice')}
        toppings={[{ topping: topping('Milk Foam'), quantity: 1 }]}
      />,
    );
    expect(uses('kt-foam-cap')).toHaveLength(1);
    expect(uses('kt-foam-cap')[0]?.getAttribute('class')).toContain('livecup__cap--new');
    expect(liquid()?.getAttribute('y')).toBe('60');
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(0));
  });

  it('removes bodies when a lot is taken away', async () => {
    const two = [{ topping: topping('Boba'), quantity: 2 }];
    const one = [{ topping: topping('Boba'), quantity: 1 }];
    const { rerender } = render(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('No ice')} toppings={two} />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(10));
    rerender(
      <LiveCup colour="#E0912D" sugar={level('100%')} ice={level('No ice')} toppings={one} />,
    );
    await waitFor(() => expect(uses('kt-pearl')).toHaveLength(5));
  });
});

describe('CupSprite', () => {
  it('provides the symbols the cup uses', () => {
    render(<CupSprite />);
    for (const id of ['kt-cup-inner', 'kt-cup-body', 'kt-pearl', 'kt-foam-cap', 'kt-stamp-full']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
