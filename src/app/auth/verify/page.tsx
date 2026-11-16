'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
function VerifyForm() {
  const params = useSearchParams();
  const type = params.get('type') === 'SMS' ? 'SMS' : 'EMAIL';
  const identifier = params.get('identifier') || '';
  const [token, setToken] = useState(params.get('token') || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, identifier, token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.history.replaceState(null, '', '/auth/verify');
      window.location.replace('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to verify.');
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <div className="panel">
        <p className="mb-4 text-sm font-bold text-teal-700">JobPilotAI</p>
        <h1 className="text-2xl font-semibold">
          {type === 'SMS' ? 'Enter your code' : 'Confirm your sign-in'}
        </h1>
        <p className="my-4 break-words text-sm text-slate-500">
          {identifier ||
            'This link is missing sign-in details. Please request a new one.'}
        </p>
        <form onSubmit={verify}>
          {type === 'SMS' && (
            <>
              <label htmlFor="code" className="text-sm">
                6-digit code
              </label>
              <input
                className="input"
                id="code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </>
          )}
          <button
            className="button mt-4 w-full"
            disabled={busy || !identifier || !token}
          >
            {busy ? 'Verifying…' : 'Continue to workspace →'}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <Link href="/login" className="mt-6 block text-sm text-teal-800">
          Request a new link or code
        </Link>
      </div>
    </main>
  );
}
export default function Verify() {
  return (
    <Suspense fallback={<p className="p-10">Loading sign-in…</p>}>
      <VerifyForm />
    </Suspense>
  );
}
