'use client';
import Link from 'next/link';
import { useState } from 'react';
export default function Login() {
  const [type, setType] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, identifier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (type === 'SMS')
        window.location.assign(
          `/auth/verify?type=SMS&identifier=${encodeURIComponent(identifier.trim())}`,
        );
      else setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Link href="/" className="text-xl font-bold">
        JobPilot<span className="text-teal-700">AI</span>
      </Link>
      <div className="panel mt-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
          Your next chapter
        </p>
        <h1 className="text-3xl font-semibold">Welcome aboard.</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-slate-500">
          Sign in or create an account. No password to remember.
        </p>
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          {(['EMAIL', 'SMS'] as const).map((method) => (
            <button
              key={method}
              onClick={() => {
                setType(method);
                setIdentifier('');
                setSent(false);
                setError('');
              }}
              className={`flex-1 rounded-lg py-2 text-sm ${type === method ? 'bg-white shadow-sm' : 'text-slate-500'}`}
              aria-pressed={type === method}
            >
              {method === 'EMAIL' ? 'Email link' : 'Phone code'}
            </button>
          ))}
        </div>
        {sent ? (
          <div role="status">
            <h2 className="font-semibold">Check your inbox</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your sign-in link is on its way. It expires in 15 minutes. In
              local development, check the server console.
            </p>
            <button
              className="mt-5 text-sm text-teal-800"
              onClick={() => setSent(false)}
            >
              Use another email
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="text-sm font-medium" htmlFor="identifier">
              {type === 'EMAIL'
                ? 'Email address'
                : 'Phone number (international format)'}
            </label>
            <input
              id="identifier"
              className="input"
              type={type === 'EMAIL' ? 'email' : 'tel'}
              autoComplete={type === 'EMAIL' ? 'email' : 'tel'}
              placeholder={
                type === 'EMAIL' ? 'you@example.com' : '+14155552671'
              }
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <button className="button mt-5 w-full" disabled={busy}>
              {busy
                ? 'Sending…'
                : type === 'EMAIL'
                  ? 'Send sign-in link →'
                  : 'Send verification code →'}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="mt-7 text-xs leading-5 text-slate-500">
          Use an address or phone you control. Email and phone sign-ins create
          separate accounts; account linking is not yet available.
        </p>
      </div>
    </main>
  );
}
