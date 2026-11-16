'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { TailoredContent } from '@/lib/tailor/content';
import { draftFor, applyDraft, type TextDraft } from '@/lib/tailor/draft';
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  email: string | null;
  linkedinUrl: string | null;
};
type Draft = {
  id: string;
  contactId: string | null;
  channel: 'LINKEDIN' | 'EMAIL';
  subject: string;
  body: string;
};
type Tailored = { id: string; content: TailoredContent };
export default function Preparation({ jobId }: { jobId: string }) {
  const [tailored, setTailored] = useState<Tailored | null>(null);
  const [textDraft, setTextDraft] = useState<TextDraft>({
    skills: '',
    bullets: [],
  });
  const [cover, setCover] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const initializedJob = useRef<string | null>(null);
  const [loadedJob, setLoadedJob] = useState<string | null>(null);
  const loading = loadedJob !== jobId;
  useEffect(() => {
    if (initializedJob.current === jobId) return;
    let active = true;
    fetch(`/api/jobs/${jobId}/preparation`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(data.error);
        setTailored(data.tailored);
        if (data.tailored) setTextDraft(draftFor(data.tailored.content));
        setCover(data.coverLetter?.body || '');
        setContacts(data.contacts);
        setDrafts(data.drafts);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) {
          initializedJob.current = jobId;
          setLoadedJob(jobId);
        }
      });
    return () => {
      active = false;
    };
  }, [jobId]);
  async function action(kind: 'tailor' | 'cover-letter' | 'outreach') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/jobs/${jobId}/${kind}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind === 'tailor') {
        setTailored(data.tailored);
        setTextDraft(draftFor(data.tailored.content));
      }
      if (kind === 'cover-letter') setCover(data.coverLetter.body);
      if (kind === 'outreach') {
        setContacts(data.contacts);
        setDrafts(data.drafts);
      }
      setMessage('Draft created. Review carefully before using.');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to generate draft.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!tailored) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/tailored/${tailored.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyDraft(tailored.content, textDraft)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTailored(data.tailored);
      setTextDraft(draftFor(data.tailored.content));
      setMessage('Tailored resume saved. Downloads use the saved version.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied to clipboard.');
    } catch {
      setError(
        'Clipboard unavailable. Select the draft text and copy it manually.',
      );
    }
  }
  function edit(patch: Partial<TailoredContent>) {
    if (tailored)
      setTailored({ ...tailored, content: { ...tailored.content, ...patch } });
  }
  return (
    <section className="panel mt-6">
      <h2 className="text-xl font-semibold">Prepare your application</h2>
      <p className="my-3 text-sm leading-6 text-slate-500">
        Drafts only — nothing is sent or submitted. AI receives profile and job
        text if you configure a real provider. Employers, titles, dates,
        education and skills stay grounded in your profile.
      </p>
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          disabled={busy || loading}
          className="button"
          onClick={() => action('tailor')}
        >
          {busy ? 'Working…' : 'Tailor resume'}
        </button>
        <button
          disabled={busy || loading}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          onClick={() => action('cover-letter')}
        >
          Cover letter
        </button>
      </div>
      {loading && (
        <p role="status" className="my-4 text-sm text-slate-500">
          Loading saved preparation…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="my-4 text-sm text-teal-800">
          {message}
        </p>
      )}
      {tailored && (
        <div className="border-t pt-5">
          <h3 className="font-semibold">Tailored resume · Review changes</h3>
          <p className="my-3 text-sm">
            Skill keyword coverage: {tailored.content.keywordCoverage.before}%
            before → {tailored.content.keywordCoverage.after}% after
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Coverage cannot improve by inventing skills. Tailoring prioritizes
            evidence you already have.
          </p>
          <ul className="mb-5 list-inside list-disc text-sm text-slate-600">
            {tailored.content.changes.map((change, index) => (
              <li key={index}>{change}</li>
            ))}
          </ul>
          <p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Conservative fact guard: use your original or generated wording. You
            can remove/reorder skills and approved bullets; arbitrary new claims
            are rejected. Edit the source profile for other factual corrections,
            then regenerate. Save before downloading.
          </p>
          <fieldset disabled={busy || loading}>
            <label className="mb-4 block text-sm font-semibold">
              Headline
              <input
                className="input"
                value={tailored.content.headline}
                onChange={(event) => edit({ headline: event.target.value })}
              />
            </label>
            <label className="mb-4 block text-sm font-semibold">
              Summary
              <textarea
                className="input min-h-36"
                value={tailored.content.summary}
                onChange={(event) => edit({ summary: event.target.value })}
              />
            </label>
            <label className="mb-4 block text-sm font-semibold">
              Skills (comma-separated)
              <input
                className="input"
                value={textDraft.skills}
                onBlur={() =>
                  edit({
                    skills: applyDraft(tailored.content, textDraft).skills,
                  })
                }
                onChange={(event) =>
                  setTextDraft({ ...textDraft, skills: event.target.value })
                }
              />
            </label>
            {tailored.content.experience.map((entry, index) => (
              <label key={index} className="mb-4 block text-sm font-semibold">
                {entry.title} · {entry.company} · {entry.start}–{entry.end}
                <textarea
                  className="input min-h-28 font-normal"
                  aria-label={`Bullets for ${entry.company}`}
                  value={textDraft.bullets[index] ?? ''}
                  onBlur={() =>
                    edit({
                      experience: applyDraft(tailored.content, textDraft)
                        .experience,
                    })
                  }
                  onChange={(event) =>
                    setTextDraft({
                      ...textDraft,
                      bullets: textDraft.bullets.map((value, i) =>
                        i === index ? event.target.value : value,
                      ),
                    })
                  }
                />
                <span className="text-xs font-normal text-slate-500">
                  One original or generated bullet per line.
                </span>
              </label>
            ))}
            <button type="button" className="button" onClick={save}>
              Save edits
            </button>
          </fieldset>
          <div className="my-5 flex gap-5 text-sm font-semibold text-teal-800">
            <a href={`/api/tailored/${tailored.id}/download?format=docx`}>
              Download DOCX ↓
            </a>
            <a href={`/api/tailored/${tailored.id}/download?format=pdf`}>
              Download PDF ↓
            </a>
          </div>
        </div>
      )}
      {cover && (
        <div className="mt-6 border-t pt-5">
          <h3 className="mb-3 font-semibold">Cover letter</h3>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6">
            {cover}
          </pre>
          <button
            className="mt-3 text-sm font-semibold text-teal-800"
            onClick={() => copy(cover)}
          >
            Copy cover letter
          </button>
        </div>
      )}
      <div className="mt-6 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Who do I know here?</h3>
          <Link
            className="text-sm text-teal-800 underline"
            href="/dashboard/contacts"
          >
            Manage contacts
          </Link>
        </div>
        {contacts.length ? (
          <ul className="my-4 space-y-3">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="rounded-xl bg-slate-50 p-3 text-sm"
              >
                <strong>
                  {contact.firstName} {contact.lastName}
                </strong>{' '}
                · {contact.position} · {contact.company}
                {contact.linkedinUrl && (
                  <a
                    className="ml-3 text-teal-800 underline"
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="my-4 text-sm text-slate-500">
            No matching company contacts yet. Import your LinkedIn export or add
            contacts manually. A cold email template is available even without
            contacts.
          </p>
        )}
        <button
          className="button"
          disabled={busy || loading}
          onClick={() => action('outreach')}
        >
          Draft outreach
        </button>
        {drafts.map((draft) => {
          const contact = contacts.find(
            (contact) => contact.id === draft.contactId,
          );
          return (
            <article key={draft.id} className="mt-5 rounded-xl border p-4">
              <h4 className="text-sm font-semibold">
                {draft.channel === 'LINKEDIN'
                  ? 'LinkedIn connection / referral note'
                  : contact
                    ? 'Referral email'
                    : 'Recruiter / hiring-manager cold email'}
                {contact ? ` · ${contact.firstName}` : ''}
              </h4>
              {draft.channel === 'LINKEDIN' && (
                <p className="my-2 text-xs text-slate-500">
                  {draft.body.length}/300 characters
                </p>
              )}
              {draft.subject && (
                <p className="my-2 text-sm font-semibold">{draft.subject}</p>
              )}
              <pre className="my-3 whitespace-pre-wrap font-sans text-sm leading-6">
                {draft.body}
              </pre>
              <div className="flex flex-wrap gap-4 text-sm text-teal-800">
                <button
                  onClick={() =>
                    copy(
                      `${draft.subject ? `${draft.subject}\n\n` : ''}${draft.body}`,
                    )
                  }
                >
                  Copy draft
                </button>
                {draft.channel === 'EMAIL' && (
                  <a
                    href={`mailto:${encodeURIComponent(contact?.email || '')}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                  >
                    Open email draft ↗
                  </a>
                )}
                {draft.channel === 'LINKEDIN' && contact?.linkedinUrl && (
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open LinkedIn ↗
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
