import { useCallback, useEffect, useRef, useState } from 'react';
import { startArsLogin } from '@/application/session/ars-auth';
import { Button } from '@/components/ui/button';

export function Login({ redirectTo }: { redirectTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);
  const search = new URLSearchParams(window.location.search);
  const autoConnect = search.get('ars_auto') === '1' && /^[a-f0-9-]{36}$/.test(search.get('ars_team') ?? '');
  const connect = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setBusy(true);
    setError('');
    void startArsLogin(redirectTo).catch(() => {
      setError('Unable to start sign-in. Please try again.');
      setBusy(false);
      started.current = false;
    });
  }, [redirectTo]);

  useEffect(() => {
    if (autoConnect) connect();
  }, [autoConnect, connect]);

  return (
    <div className='flex h-full flex-col items-center justify-center gap-5 px-4 py-10 text-text-primary'>
      <h1 className='text-xl font-semibold'>ARS Workspace</h1>
      {busy ? (
        <p role='status'>Opening Workspace…</p>
      ) : (
        <>
          <p>Continue with your African Research Society account.</p>
          <Button size='lg' onClick={connect}>
            Continue with ARS
          </Button>
        </>
      )}
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
