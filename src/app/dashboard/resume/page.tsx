'use client';
import { useEffect, useState } from 'react';
import type { ProfileData } from '@/lib/profile/schema';
function Chips({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const next = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange([...new Set([...values, ...next])]);
    setDraft('');
  }
  return (
    <fieldset className="mb-6">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-900"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <input
          aria-label={`Add ${label.toLowerCase()}`}
          className="input"
          placeholder="Type a value, then Add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
          type="button"
          onClick={add}
        >
          Add
        </button>
      </div>
    </fieldset>
  );
}
export default function ResumePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    fetch('/api/profile')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProfile(data.profile);
        setFileName(data.resume?.fileName || '');
      })
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error('Resume must be 5 MB or smaller.');
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/resume', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
      setFileName(data.resume.fileName);
      setMessage(
        'Resume parsed. Review your profile below before saving any corrections.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
      setMessage('Profile saved.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-4xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
        Your experience, in focus
      </p>
      <h1 className="text-3xl font-semibold">Your resume & profile</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">
        Upload once, then make it yours. Review extracted details for accuracy.
        Local mode uses deterministic parsing; configured AI providers receive
        your resume text.
      </p>
      <form onSubmit={upload} className="panel mb-6">
        <h2 className="mb-3 text-lg font-semibold">Upload your resume</h2>
        <p className="mb-4 text-sm text-slate-500">
          PDF or DOCX · Up to 5 MB · Text-based documents only. Uploading a new
          resume replaces your primary resume and parsed profile, including
          edits.
        </p>
        <label htmlFor="resume-file" className="sr-only">
          Resume file
        </label>
        <input
          id="resume-file"
          type="file"
          accept=".pdf,.docx"
          required
          disabled={busy}
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button disabled={busy || !file || loading} className="button mt-5">
          {busy ? 'Working…' : 'Upload & parse →'}
        </button>
        {fileName && (
          <p className="mt-4 break-all text-xs text-slate-500">
            Primary resume: {fileName}
          </p>
        )}
      </form>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-900"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p>Loading your profile…</p>
      ) : profile ? (
        <form onSubmit={save} className="panel">
          <h2 className="mb-6 text-lg font-semibold">Review your profile</h2>
          <fieldset disabled={busy} className="disabled:opacity-60">
            <label className="mb-5 block text-sm font-semibold">
              Headline
              <input
                className="input"
                maxLength={500}
                value={profile.headline}
                onChange={(e) =>
                  setProfile({ ...profile, headline: e.target.value })
                }
              />
            </label>
            <label className="mb-6 block text-sm font-semibold">
              Summary
              <textarea
                className="input min-h-32"
                maxLength={6000}
                value={profile.summary}
                onChange={(e) =>
                  setProfile({ ...profile, summary: e.target.value })
                }
              />
            </label>
            <Chips
              label="Skills"
              values={profile.skills}
              onChange={(skills) => setProfile({ ...profile, skills })}
            />
            <Chips
              label="Titles"
              values={profile.titles}
              onChange={(titles) => setProfile({ ...profile, titles })}
            />
            <Chips
              label="Locations"
              values={profile.locations}
              onChange={(locations) => setProfile({ ...profile, locations })}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Years of experience
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="80"
                  step="0.1"
                  value={profile.yearsExperience ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      yearsExperience:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm font-semibold">
                Seniority
                <input
                  className="input"
                  maxLength={500}
                  value={profile.seniority}
                  onChange={(e) =>
                    setProfile({ ...profile, seniority: e.target.value })
                  }
                />
              </label>
            </div>
            <h3 className="mb-3 mt-7 font-semibold">Experience</h3>
            {profile.experience.length ? (
              profile.experience.map((item, i) => (
                <article
                  key={i}
                  className="mb-3 rounded-xl bg-slate-50 p-4 text-sm"
                >
                  <h4 className="font-semibold">
                    {item.title}
                    {item.company && ` · ${item.company}`}
                  </h4>
                  <p className="my-2 text-slate-500">
                    {item.start} — {item.end}
                  </p>
                  <ul className="list-inside list-disc">
                    {item.bullets.map((bullet, j) => (
                      <li key={j}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No experience entries detected.
              </p>
            )}
            <h3 className="mb-3 mt-6 font-semibold">Education</h3>
            {profile.education.length ? (
              profile.education.map((item, i) => (
                <p key={i} className="mb-2 text-sm">
                  {[item.institution, item.degree, item.year]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No education entries detected.
              </p>
            )}
            <button className="button mt-7" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </fieldset>
        </form>
      ) : (
        <section className="panel text-sm text-slate-500">
          No profile yet. Upload a resume to get started.
        </section>
      )}
    </div>
  );
}
