import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/client';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; timestamp: string }
  | { kind: 'error'; message: string };

export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (!cancelled) setStatus({ kind: 'ok', timestamp: health.timestamp });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  switch (status.kind) {
    case 'loading':
      return <p role="status">API: checking...</p>;
    case 'ok':
      return <p role="status">API: ok (as of {status.timestamp})</p>;
    case 'error':
      return <p role="alert">API: unreachable ({status.message})</p>;
  }
}
