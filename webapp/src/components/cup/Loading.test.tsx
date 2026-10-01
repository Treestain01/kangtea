import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loading } from './Loading';

describe('Loading', () => {
  it('announces the message and shows a pouring cup', () => {
    render(<Loading>Loading the menu</Loading>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the menu');
    expect(document.querySelector('svg.staticcup--pouring')).not.toBeNull();
  });
});
