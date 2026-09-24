import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { createAppRouter } from './router';
import { StoresProvider } from './store/StoresProvider';
import { createLocalStores } from './store/local';
import { startOrderProgress } from './store/orderProgress';
import './theme/tokens.css';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const stores = createLocalStores(window.localStorage);
// Simulated kitchen: advances a placed order to making and ready. See store/orderProgress.ts.
startOrderProgress(stores.orders);

createRoot(rootElement).render(
  <StrictMode>
    <StoresProvider stores={stores}>
      <RouterProvider router={createAppRouter()} />
    </StoresProvider>
  </StrictMode>,
);
