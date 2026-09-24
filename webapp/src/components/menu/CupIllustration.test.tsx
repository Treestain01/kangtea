import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CupIllustration } from './CupIllustration';

describe('CupIllustration', () => {
  it('tints the cup with the drink colour', () => {
    render(<CupIllustration colour="#B07A45" pearls={false} />);
    expect(screen.getByTestId('cup').style.getPropertyValue('--tea')).toBe('#B07A45');
  });

  it('shows pearls only when asked', () => {
    const { rerender } = render(<CupIllustration colour="#B07A45" pearls />);
    expect(screen.getByTestId('cup')).toHaveClass('cup--pearls');
    rerender(<CupIllustration colour="#B07A45" pearls={false} />);
    expect(screen.getByTestId('cup')).not.toHaveClass('cup--pearls');
  });

  it('is hidden from assistive technology', () => {
    render(<CupIllustration colour="#B07A45" pearls={false} />);
    expect(screen.getByTestId('cup')).toHaveAttribute('aria-hidden', 'true');
  });
});
