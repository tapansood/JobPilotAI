'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function Tracking({ jobId }: { jobId: string }) {
  const [application, setApplication] = useState<{
      id: string;
      status: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/applications?jobId=${encodeURIComponent(jobId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setApplication(data.applications[0] || null);
      })
      .catch((error) => setError(error.message));
  }, [jobId]);
  async function track(applied = false) {
    setBusy(true);
    setError('');
    try {
      const preparation = await fetch(`/api/jobs/${jobId}/preparation`);
      const drafts = await preparation.json();
      if (!preparation.ok) throw new Error(drafts.error);
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          ...(applied ? { status: 'APPLIED' } : {}),
          ...(drafts.tailored ? { tailoredResumeId: drafts.tailored.id } : {}),
          ...(drafts.coverLetter
            ? { coverLetterId: drafts.coverLetter.id }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setApplication(data.application);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to track application.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel mt-6">
      <h2 className="mb-3 text-xl font-semibold">Application tracking</h2>
      <p className="mb-4 text-sm text-slate-500">
        Tracking links your latest prepared drafts. Mark applied only after you
        submit externally; this does not submit anything.
      </p>
      {error && (
        <p role="alert" className="mb-4 text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button className="button" disabled={busy} onClick={() => track()}>
          {application ? 'Update linked drafts' : 'Track application'}
        </button>
        <button
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          disabled={busy || (!!application && application.status !== 'SAVED')}
          onClick={() => track(true)}
        >
          Mark applied
        </button>
        {application && (
          <Link
            href={`/dashboard/applications/${application.id}`}
            className="text-sm text-teal-800 underline"
          >
            View tracker · {application.status}
          </Link>
        )}
      </div>
    </section>
  );
}
