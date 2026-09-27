import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { CatalogueProvider } from './api/CatalogueProvider';
import { AuthProvider } from './auth/AuthProvider';
import { apiAuthClient } from './auth/apiAuthClient';
import { apiLoyaltyClient } from './loyalty/apiLoyaltyClient';
import { LoyaltyProvider } from './loyalty/LoyaltyProvider';
import { createAppRouter } from './router';
import { StoresProvider } from './store/StoresProvider';
import { createLocalStores } from './store/local';
import { startOrderProgress } from './store/orderProgress';
import { bindTheme } from './theme/theme';
import './theme/tokens.css';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const stores = createLocalStores(window.localStorage);
// Reflect the saved theme choice on <html> before the first render, then keep it in step.
bindTheme(stores.preferences);
// Simulated kitchen: advances a placed order to making and ready. See store/orderProgress.ts.
startOrderProgress(stores.orders);

createRoot(rootElement).render(
  <StrictMode>
    <StoresProvider stores={stores}>
      <CatalogueProvider>
        <AuthProvider client={apiAuthClient}>
          <LoyaltyProvider client={apiLoyaltyClient}>
            <RouterProvider router={createAppRouter()} />
          </LoyaltyProvider>
        </AuthProvider>
      </CatalogueProvider>
    </StoresProvider>
  </StrictMode>,
);
