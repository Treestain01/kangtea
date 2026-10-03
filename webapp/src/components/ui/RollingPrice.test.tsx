import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RollingPrice } from './RollingPrice';

describe('RollingPrice', () => {
  it('reads as the formatted price', () => {
    const { container } = render(<RollingPrice cents={1250} />);
    expect(container).toHaveTextContent('$12.50');
  });

  it('gives each digit a face to roll in and leaves punctuation alone', () => {
    const { container } = render(<RollingPrice cents={1250} />);
    const digits = [...container.querySelectorAll('.roll__digit')].map((digit) =>
      digit.getAttribute('data-digit'),
    );
    expect(digits).toEqual(['1', '2', '5', '0']);
    expect(container.textContent).toBe('$12.50');
  });

  it('keeps the digits that did not change and remounts the ones that did', () => {
    const { container, rerender } = render(<RollingPrice cents={1250} />);
    const before = [...container.querySelectorAll('.roll__digit')];
    rerender(<RollingPrice cents={1290} />);
    const after = [...container.querySelectorAll('.roll__digit')];
    expect(after).toHaveLength(4);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).not.toBe(before[2]);
    expect(container.textContent).toBe('$12.90');
  });
});
