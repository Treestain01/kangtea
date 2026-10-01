import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { customisationsFixture, menuItemFixture } from '../../store/testing';
import { CustomiseDrinkDialog } from './CustomiseDrinkDialog';

const item = menuItemFixture();

function renderDialog(onAdd = vi.fn(), onClose = vi.fn()) {
  render(
    <CustomiseDrinkDialog
      item={item}
      customisations={customisationsFixture}
      onAdd={onAdd}
      onClose={onClose}
    />,
  );
  return { onAdd, onClose };
}

const addTopping = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Add ${name}`) }));
const addButton = () => screen.getByRole('button', { name: /Add to order/ });
const summary = () => screen.getByRole('region', { name: 'Order summary' });

describe('CustomiseDrinkDialog', () => {
  it('opens with the drink, the defaults selected and the base price on the button', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Signature Milk Tea' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '100%' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Regular ice' })).toBeChecked();
    expect(addButton()).toHaveTextContent('$7.50');
  });

  it('puts the cup between a sugar dial and an ice dial, highest level at the top', () => {
    renderDialog();
    const sugar = screen.getByRole('group', { name: 'Sugar' });
    const ice = screen.getByRole('group', { name: 'Ice' });
    expect(
      within(sugar)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['sugar-100', 'sugar-50']);
    expect(
      within(ice)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['ice-regular', 'ice-less']);
    expect(
      screen.getByRole('img', { name: /Signature Milk Tea as you have built it/ }),
    ).toBeVisible();
  });

  it('reads the drink, choices and toppings back in one line', () => {
    renderDialog();
    addTopping('Pearls');
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    expect(summary()).toHaveTextContent('2 × Signature Milk Tea');
    expect(summary()).toHaveTextContent('100% sugar · Regular ice · Pearls');
    expect(addButton()).toHaveTextContent('$16.60');
  });

  it('shows the category beside the drink name when given', () => {
    render(
      <CustomiseDrinkDialog
        item={{ ...item, description: '招牌奶茶' }}
        categoryName="Milk Tea"
        customisations={customisationsFixture}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('招牌奶茶 · Milk Tea')).toBeInTheDocument();
  });

  it('updates the total as toppings and quantity change', () => {
    renderDialog();
    addTopping('Pearls');
    expect(addButton()).toHaveTextContent('$8.30');
    addTopping('Pudding');
    expect(addButton()).toHaveTextContent('$9.30');
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    expect(addButton()).toHaveTextContent('$18.60');
  });

  describe('more than one of a topping', () => {
    it('adds another lot on each tap, prices every lot, and shows the count', () => {
      renderDialog();
      addTopping('Pearls');
      addTopping('Pearls');
      expect(
        screen.getByRole('button', { name: 'Add Pearls, $0.80 each, 2 added' }),
      ).toHaveAttribute('aria-pressed', 'true');
      expect(addButton()).toHaveTextContent('$9.10');
      expect(summary()).toHaveTextContent('Pearls ×2');
    });

    it('takes one lot away with the minus, and hides it at zero', () => {
      renderDialog();
      expect(screen.queryByRole('button', { name: 'Remove one Pearls' })).not.toBeInTheDocument();
      addTopping('Pearls');
      addTopping('Pearls');
      fireEvent.click(screen.getByRole('button', { name: 'Remove one Pearls' }));
      expect(addButton()).toHaveTextContent('$8.30');
      fireEvent.click(screen.getByRole('button', { name: 'Remove one Pearls' }));
      expect(addButton()).toHaveTextContent('$7.50');
      expect(screen.queryByRole('button', { name: 'Remove one Pearls' })).not.toBeInTheDocument();
    });

    it('stops at three lots of one topping', () => {
      renderDialog();
      for (let i = 0; i < 5; i += 1) addTopping('Pearls');
      expect(addButton()).toHaveTextContent('$9.90');
      expect(screen.getByRole('button', { name: /^Add Pearls/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('adds a line carrying the topping quantity', () => {
      const { onAdd } = renderDialog();
      addTopping('Pearls');
      addTopping('Pearls');
      addTopping('Pudding');
      fireEvent.click(addButton());
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          unitPriceCents: 750 + 160 + 100,
          customisations: [
            { name: 'Sugar', value: '100%' },
            { name: 'Ice', value: 'Regular ice' },
            { name: 'Topping', value: 'Pearls', quantity: 2 },
            { name: 'Topping', value: 'Pudding' },
          ],
        }),
      );
    });
  });

  it('opens on the levels it is given instead of the defaults', () => {
    render(
      <CustomiseDrinkDialog
        item={item}
        customisations={customisationsFixture}
        initial={{ sugarId: 'sugar-50', iceId: 'ice-less' }}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: '50%' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Less ice' })).toBeChecked();
  });

  it('will not go below one drink', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'One fewer' })).toBeDisabled();
  });

  it('adds a line with the chosen options and toppings priced in, then closes', () => {
    const { onAdd, onClose } = renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: '50%' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Less ice' }));
    addTopping('Pearls');
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith({
      itemId: 'signature-milk-tea',
      name: 'Signature Milk Tea',
      unitPriceCents: 830,
      quantity: 2,
      customisations: [
        { name: 'Sugar', value: '50%' },
        { name: 'Ice', value: 'Less ice' },
        { name: 'Topping', value: 'Pearls' },
      ],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing visible when there is no drink', () => {
    render(
      <CustomiseDrinkDialog
        item={null}
        customisations={customisationsFixture}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
