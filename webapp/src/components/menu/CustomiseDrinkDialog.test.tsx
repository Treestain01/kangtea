import { fireEvent, render, screen } from '@testing-library/react';
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

describe('CustomiseDrinkDialog', () => {
  it('opens with the drink, the defaults selected and the base price on the button', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Signature Milk Tea' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '100%' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Regular ice' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Add to order/ })).toHaveTextContent('$7.50');
  });

  it('itemises the drink, choices and toppings in the summary', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('checkbox', { name: /Pearls/ }));
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    const summary = screen.getByRole('region', { name: 'Order summary' });
    expect(summary).toHaveTextContent('2 × Signature Milk Tea');
    expect(summary).toHaveTextContent('$15.00');
    expect(summary).toHaveTextContent('100% sugar · Regular ice');
    expect(summary).toHaveTextContent('Pearls');
    expect(summary).toHaveTextContent('$1.60');
    expect(summary).toHaveTextContent('Subtotal');
    expect(summary).toHaveTextContent('$16.60');
  });

  it('shows the category as an eyebrow when given', () => {
    render(
      <CustomiseDrinkDialog
        item={item}
        categoryName="Milk Tea"
        customisations={customisationsFixture}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Milk Tea')).toBeInTheDocument();
  });

  it('updates the total as toppings and quantity change', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('checkbox', { name: /Pearls/ }));
    expect(screen.getByRole('button', { name: /Add to order/ })).toHaveTextContent('$8.30');
    fireEvent.click(screen.getByRole('checkbox', { name: /Pudding/ }));
    expect(screen.getByRole('button', { name: /Add to order/ })).toHaveTextContent('$9.30');
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    expect(screen.getByRole('button', { name: /Add to order/ })).toHaveTextContent('$18.60');
  });

  it('will not go below one drink', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'One fewer' })).toBeDisabled();
  });

  it('adds a line with the chosen options and toppings priced in, then closes', () => {
    const { onAdd, onClose } = renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: '50%' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Less ice' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Pearls/ }));
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    fireEvent.click(screen.getByRole('button', { name: /Add to order/ }));
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
