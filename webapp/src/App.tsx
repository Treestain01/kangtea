import { KangTeaLogo } from './components/brand/KangTeaLogo';
import { ApiStatus } from './components/ApiStatus';
import { isInIosShell } from './platform';

export function App() {
  return (
    <main className="app">
      <header className="app__header">
        <KangTeaLogo size={72} />
        <h1 className="visually-hidden">Kang Tea</h1>
      </header>
      <p>Order ahead, skip the queue.</p>
      {isInIosShell() && <p className="shell-note">Running inside the Kang Tea iOS app.</p>}
      <ApiStatus />
    </main>
  );
}
