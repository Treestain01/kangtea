import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RollingPrice } from './RollingPrice';

describe('RollingPrice', () => {
  it('reads as the formatted price', () => {
    const { container } = render(<RollingPrice cents={1250} />);
    expect(container).toHaveTextContent('$12.50');
  });

  it('gives each digit its strip position and leaves punctuation alone', () => {
    const { container } = render(<RollingPrice cents={1250} />);
    const digits = [...container.querySelectorAll('.roll__digit')].map((digit) =>
      (digit as HTMLElement).style.getPropertyValue('--d'),
    );
    expect(digits).toEqual(['1', '2', '5', '0']);
    expect(container.textContent).toBe('$12.50');
  });
});
