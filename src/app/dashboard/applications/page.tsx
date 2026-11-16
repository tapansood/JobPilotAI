'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  statuses,
  daysSinceApplied,
  followUpState,
  type Status,
} from '@/lib/applications/logic';
import ApplicationEditor, { type ApplicationRecord } from './editor';
export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [version, setVersion] = useState(0);
  useEffect(() => {
    fetch('/api/applications')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setApplications(data.applications);
      })
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function move(id: string, status: Status) {
    setBusy(id);
    setError('');
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setApplications((current) =>
        current.map((application) =>
          application.id === id ? data.application : application,
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to move application.',
      );
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="max-w-full">
      <h1 className="text-3xl font-semibold">Application tracker</h1>
      <p className="my-4 text-sm text-slate-500">
        Move cards using their status dropdown. All controls work with a
        keyboard. Follow-up dates use UTC; nothing is sent automatically.
      </p>
      {error && (
        <p role="alert" className="my-4 text-red-800">
          {error}
        </p>
      )}
      <details className="my-6">
        <summary className="mb-4 cursor-pointer font-semibold text-teal-800">
          Add a job found elsewhere
        </summary>
        <ApplicationEditor
          key={version}
          onSaved={(application) => {
            setApplications((current) => [application, ...current]);
            setVersion(version + 1);
          }}
        />
      </details>
      {loading ? (
        <p role="status">Loading applications…</p>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-6"
          aria-label="Applications by status"
        >
          {statuses.map((status) => {
            const cards = applications.filter(
              (application) => application.status === status,
            );
            return (
              <section
                key={status}
                aria-label={`${status} applications`}
                className="w-72 shrink-0 rounded-2xl bg-slate-100 p-4"
              >
                <h2 className="mb-4 text-sm font-bold">
                  {status} · {cards.length}
                </h2>
                <div className="space-y-4">
                  {cards.map((application) => {
                    const days = daysSinceApplied(application.appliedAt),
                      due = followUpState(
                        application.nextFollowUpAt,
                        application.status,
                      );
                    return (
                      <article
                        key={application.id}
                        className="rounded-xl border bg-white p-4 shadow-sm"
                      >
                        <p className="text-xs font-semibold text-teal-800">
                          {application.company}
                        </p>
                        <Link
                          href={`/dashboard/applications/${application.id}`}
                          className="my-2 block font-semibold underline decoration-slate-300 underline-offset-4"
                        >
                          {application.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {days === null
                            ? 'Not marked applied'
                            : `${days} day${days === 1 ? '' : 's'} since applied`}
                        </p>
                        {due && (
                          <p
                            className={`my-3 rounded-lg px-2 py-1 text-xs font-semibold ${due === 'overdue' ? 'bg-red-100 text-red-900' : due === 'today' ? 'bg-amber-100 text-amber-900' : 'bg-teal-50 text-teal-900'}`}
                          >
                            {due === 'overdue'
                              ? 'Overdue follow-up'
                              : due === 'today'
                                ? 'Follow-up due today'
                                : 'Follow-up scheduled'}{' '}
                            · {application.nextFollowUpAt?.slice(0, 10)}
                          </p>
                        )}
                        <label className="mt-4 block text-xs font-semibold">
                          Move to
                          <select
                            className="input"
                            aria-label={`Status for ${application.title} at ${application.company}`}
                            value={application.status}
                            disabled={busy === application.id}
                            onChange={(event) =>
                              move(application.id, event.target.value as Status)
                            }
                          >
                            {statuses.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}
                  {!cards.length && (
                    <p className="text-sm text-slate-500">
                      No applications yet.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
