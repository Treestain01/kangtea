import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KangTeaLogo } from './KangTeaLogo';
import { KangTeaMark } from './KangTeaMark';

describe('KangTeaMark', () => {
  it('is an accessible image named Kang Tea', () => {
    render(<KangTeaMark />);
    expect(screen.getByRole('img', { name: 'Kang Tea' })).toBeInTheDocument();
  });

  it('inherits its colour from the surrounding text', () => {
    render(<KangTeaMark />);
    const strokes = screen.getByRole('img').querySelector('g');
    expect(strokes).toHaveAttribute('stroke', 'currentColor');
  });

  it('scales from a size prop while keeping its aspect ratio', () => {
    render(<KangTeaMark size={124} />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('height', '124');
    expect(svg).toHaveAttribute('width', '70');
  });
});

describe('KangTeaLogo', () => {
  it('shows the mark, the wordmark and the Chinese name', () => {
    render(<KangTeaLogo />);
    expect(screen.getByRole('img', { name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.getByText('KANGTEA')).toBeInTheDocument();
    expect(screen.getByText('康緹')).toBeInTheDocument();
  });

  it('can render the mark alone', () => {
    render(<KangTeaLogo variant="mark" />);
    expect(screen.getByRole('img', { name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.queryByText('KANGTEA')).not.toBeInTheDocument();
  });
});
