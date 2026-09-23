import { ApiStatus } from './components/ApiStatus';
import { isInIosShell } from './platform';

export function App() {
  return (
    <main className="app">
      <h1>BBT</h1>
      <p>The BBT web app.</p>
      {isInIosShell() && <p className="shell-note">Running inside the BBT iOS app.</p>}
      <ApiStatus />
    </main>
  );
}
