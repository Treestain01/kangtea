import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../test/providers';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { createTestStores } from '../../store/testing';
import { AppShell } from './AppShell';

vi.mock('../../api/client', () => ({
  fetchStore: vi.fn().mockReturnValue(new Promise(() => {})),
  fetchMenu: vi.fn().mockReturnValue(new Promise(() => {})),
}));

function renderShell(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <p>Home content</p> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <TestProviders stores={createTestStores()}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
}

describe('AppShell', () => {
  it('frames the routed page with the heading, the order panel and the tab bar', () => {
    renderShell('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    const panel = screen.getByRole('complementary', { name: 'Your Order' });
    expect(panel).toHaveTextContent('Your order is empty.');
    expect(panel).toHaveTextContent('Add drinks from the menu and they will appear here.');
  });

  it('shows the not found page for unknown paths with a way home', () => {
    renderShell('/nowhere');
    expect(
      screen.getByRole('heading', { name: 'That page is not on the menu' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the drinks' })).toHaveAttribute('href', '/');
  });
});
