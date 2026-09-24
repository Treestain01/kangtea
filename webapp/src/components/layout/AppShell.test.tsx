import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { StoresProvider } from '../../store/StoresProvider';
import { createTestStores } from '../../store/testing';
import { AppShell } from './AppShell';

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
    <StoresProvider stores={createTestStores()}>
      <RouterProvider router={router} />
    </StoresProvider>,
  );
}

describe('AppShell', () => {
  it('frames the routed page with the heading and the tab bar', () => {
    renderShell('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Kang Tea' })).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows the not found page for unknown paths with a way home', () => {
    renderShell('/nowhere');
    expect(
      screen.getByRole('heading', { name: 'That page is not on the menu' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the drinks' })).toHaveAttribute('href', '/');
  });
});
