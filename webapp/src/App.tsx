import { HomePage } from './pages/HomePage';
import { isInIosShell } from './platform';

export function App() {
  return (
    <main className="app">
      <h1 className="visually-hidden">Kang Tea</h1>
      <HomePage />
      {isInIosShell() && <p className="shell-note">Running inside the Kang Tea iOS app.</p>}
    </main>
  );
}
