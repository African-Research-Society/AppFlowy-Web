import { useState } from 'react';
import { startArsLogin } from '@/application/session/ars-auth';
export function Login({ redirectTo }: { redirectTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className='flex h-full flex-col items-center justify-center gap-5 px-4 py-10 text-text-primary'>
      <h1 className='text-xl font-semibold'>ARS Workspace</h1>
      <p>Continue with your African Research Society account.</p>
      <button
        className='rounded bg-fill-content px-6 py-3'
        disabled={busy}
        onClick={() => {
          setBusy(true);
          startArsLogin(redirectTo).catch(() => {
            setError('Unable to start sign-in. Please try again.');
            setBusy(false);
          });
        }}
      >
        Continue with ARS
      </button>
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
