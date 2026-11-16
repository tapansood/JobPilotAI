'use client';
import { useState } from 'react';
import { statuses, type Status } from '@/lib/applications/logic';
export type ApplicationRecord = {
  id: string;
  jobId: string | null;
  company: string;
  title: string;
  url: string;
  status: Status;
  appliedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string;
  tailoredResumeId: string | null;
  coverLetterId: string | null;
  updatedAt: string;
  events?: {
    id: string;
    type: string;
    from: string | null;
    to: string | null;
    note: string | null;
    createdAt: string;
  }[];
};
export type DocumentOption = {
  id: string;
  createdAt: string;
  job: { title: string; company: string };
};
export default function ApplicationEditor({
  application,
  tailoredResumes = [],
  coverLetters = [],
  onSaved,
}: {
  application?: ApplicationRecord;
  tailoredResumes?: DocumentOption[];
  coverLetters?: DocumentOption[];
  onSaved: (application: ApplicationRecord) => void;
}) {
  const [form, setForm] = useState({
    company: application?.company || '',
    title: application?.title || '',
    url: application?.url || '',
    status: application?.status || 'SAVED',
    appliedAt: application?.appliedAt?.slice(0, 10) || '',
    nextFollowUpAt: application?.nextFollowUpAt?.slice(0, 10) || '',
    notes: application?.notes || '',
    tailoredResumeId: application?.tailoredResumeId || '',
    coverLetterId: application?.coverLetterId || '',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { appliedAt, nextFollowUpAt, ...text } = form;
      const body = {
        ...text,
        appliedAt: appliedAt ? `${appliedAt}T00:00:00Z` : null,
        ...(nextFollowUpAt
          ? { nextFollowUpAt: `${nextFollowUpAt}T00:00:00Z` }
          : application?.nextFollowUpAt
            ? { nextFollowUpAt: null }
            : {}),
        tailoredResumeId: form.tailoredResumeId || null,
        coverLetterId: form.coverLetterId || null,
      };
      const response = await fetch(
        application
          ? `/api/applications/${application.id}`
          : '/api/applications',
        {
          method: application ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.application);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save application.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="panel">
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-800">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {(['company', 'title', 'url'] as const).map((key) => (
          <label key={key} className="text-sm font-semibold">
            {key === 'url'
              ? 'Posting URL'
              : key === 'company'
                ? 'Company'
                : 'Job title'}
            <input
              className="input"
              type={key === 'url' ? 'url' : 'text'}
              required={key !== 'url'}
              maxLength={key === 'url' ? 2000 : 500}
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label className="text-sm font-semibold">
          Status
          <select
            className="input"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as Status })
            }
          >
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Applied date (UTC)
          <input
            type="date"
            className="input"
            value={form.appliedAt}
            onChange={(event) =>
              setForm({ ...form, appliedAt: event.target.value })
            }
          />
        </label>
        <label className="text-sm font-semibold">
          Next follow-up (UTC)
          <input
            type="date"
            className="input"
            value={form.nextFollowUpAt}
            onChange={(event) =>
              setForm({ ...form, nextFollowUpAt: event.target.value })
            }
          />
        </label>
        <p className="text-xs text-slate-500 sm:col-span-2">
          Marking APPLIED defaults the applied date to now and an unset
          follow-up to seven days later. Rejected and withdrawn applications do
          not count as due.
        </p>
        <label className="text-sm font-semibold sm:col-span-2">
          Notes
          <textarea
            className="input min-h-32 font-normal"
            maxLength={20000}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />
        </label>
        {application &&
          (['tailoredResumeId', 'coverLetterId'] as const).map((key) => {
            const options =
              key === 'tailoredResumeId' ? tailoredResumes : coverLetters;
            return (
              <label key={key} className="text-sm font-semibold">
                {key === 'tailoredResumeId'
                  ? 'Linked tailored resume'
                  : 'Linked cover letter'}
                <select
                  className="input"
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                >
                  <option value="">None</option>
                  {form[key] &&
                    !options.some((option) => option.id === form[key]) && (
                      <option value={form[key]}>Current linked document</option>
                    )}
                  {options.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.job.company} · {document.job.title} ·{' '}
                      {document.createdAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        <button className="button sm:col-span-2">
          {busy
            ? 'Saving…'
            : application
              ? 'Save application'
              : 'Add application'}
        </button>
      </fieldset>
    </form>
  );
}
