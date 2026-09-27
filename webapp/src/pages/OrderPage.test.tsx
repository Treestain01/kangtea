import { render, screen } from '@testing-library/react';
import { TestProviders } from '../test/providers';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../lib/useMediaQuery';
import { createTestStores } from '../store/testing';
import { OrderPage } from './OrderPage';

vi.mock('../api/client', () => ({
  fetchStore: vi.fn().mockReturnValue(new Promise(() => {})),
  fetchMenu: vi.fn().mockReturnValue(new Promise(() => {})),
}));
vi.mock('../lib/useMediaQuery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/useMediaQuery')>()),
  useMediaQuery: vi.fn(),
}));

const mockedUseMediaQuery = vi.mocked(useMediaQuery);

function renderOrderRoute() {
  render(
    <TestProviders stores={createTestStores()}>
      <MemoryRouter initialEntries={['/order']}>
        <Routes>
          <Route path="/order" element={<OrderPage />} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('OrderPage', () => {
  beforeEach(() => {
    mockedUseMediaQuery.mockReset();
  });

  it('renders the order panel on phones', () => {
    mockedUseMediaQuery.mockReturnValue(false);
    renderOrderRoute();
    expect(screen.getByRole('heading', { name: 'Your order' })).toBeInTheDocument();
  });

  it('sends desktop visitors home, where the panel is always visible', () => {
    mockedUseMediaQuery.mockReturnValue(true);
    renderOrderRoute();
    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your order' })).not.toBeInTheDocument();
  });
});
