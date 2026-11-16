'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicationEditor, {
  type ApplicationRecord,
  type DocumentOption,
} from '../editor';
export default function ApplicationDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<{
      application: ApplicationRecord;
      tailoredResumes: DocumentOption[];
      coverLetters: DocumentOption[];
    } | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      })
      .catch((error) => setError(error.message));
  }, [id]);
  async function refresh() {
    const response = await fetch(`/api/applications/${id}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }
  async function saved() {
    try {
      await refresh();
      setMessage('Application saved. Timeline updated.');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to reload application.',
      );
    }
  }
  async function remove() {
    if (!window.confirm('Delete this application and its timeline?')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push('/dashboard/applications');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete.');
      setBusy(false);
    }
  }
  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard/applications"
        className="text-sm text-teal-800 underline"
      >
        ← Application board
      </Link>
      {error && (
        <p role="alert" className="my-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="my-4 text-teal-800">
          {message}
        </p>
      )}
      {!data ? (
        <p className="my-6">
          {error ? 'Application unavailable.' : 'Loading application…'}
        </p>
      ) : (
        <>
          <h1 className="mt-6 text-3xl font-semibold">
            {data.application.title}
          </h1>
          <p className="my-3 text-slate-500">
            {data.application.company} · {data.application.status}
          </p>
          <div className="my-5 flex flex-wrap gap-5 text-sm text-teal-800">
            {data.application.jobId && (
              <Link
                href={`/dashboard/jobs/${data.application.jobId}`}
                className="underline"
              >
                Job preparation
              </Link>
            )}
            {data.application.url && (
              <a
                href={data.application.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Original posting ↗
              </a>
            )}
            {data.application.tailoredResumeId && (
              <>
                <a
                  href={`/api/tailored/${data.application.tailoredResumeId}/download?format=pdf`}
                >
                  Download resume PDF ↓
                </a>
                <a
                  href={`/api/tailored/${data.application.tailoredResumeId}/download?format=docx`}
                >
                  Download resume DOCX ↓
                </a>
              </>
            )}
            {data.application.coverLetterId && (
              <a
                href={`/api/cover-letters/${data.application.coverLetterId}/download`}
              >
                Download cover letter TXT ↓
              </a>
            )}
          </div>
          <ApplicationEditor
            key={data.application.updatedAt}
            application={data.application}
            tailoredResumes={data.tailoredResumes}
            coverLetters={data.coverLetters}
            onSaved={saved}
          />
          <p className="my-3 text-xs text-slate-500">
            Document choices show your latest 100 matching drafts. Prepare
            drafts from the linked job first.
          </p>
          <section className="panel mt-6">
            <h2 className="mb-5 text-xl font-semibold">Timeline</h2>
            <ol className="space-y-5">
              {data.application.events?.map((event) => (
                <li key={event.id} className="border-l-2 border-teal-200 pl-4">
                  <time className="text-xs text-slate-500">
                    {event.createdAt.replace('T', ' ').slice(0, 19)} UTC
                  </time>
                  <p className="mt-1 text-sm font-semibold">
                    {event.type === 'STATUS_CHANGE'
                      ? `${event.from || 'Created'} → ${event.to}`
                      : event.type === 'FOLLOW_UP'
                        ? `Follow-up: ${event.from?.slice(0, 10) || 'unset'} → ${event.to?.slice(0, 10) || 'cleared'}`
                        : 'Notes updated'}
                  </p>
                  {event.note && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {event.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {!data.application.events?.length && (
              <p className="text-sm text-slate-500">No events yet.</p>
            )}
          </section>
          <button
            disabled={busy}
            onClick={remove}
            className="my-6 rounded-xl border border-red-200 px-4 py-2 text-sm text-red-800"
          >
            Delete application
          </button>
        </>
      )}
    </div>
  );
}
