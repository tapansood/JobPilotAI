'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
type Match = {
  id: string;
  score: number;
  status: 'SAVED' | 'HIDDEN' | null;
  matchedSkills: string[];
  missingSkills: string[];
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    url: string;
    description: string;
    source: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
  };
};
export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [remote, setRemote] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<
    { source: string; message: string }[]
  >([]);
  const [searched, setSearched] = useState(false);
  const [ready, setReady] = useState(false);
  async function load() {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setMatches(data.matches);
  }
  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setQuery(data.profile?.titles?.[0] || '');
        setLocation(data.profile?.locations?.[0] || '');
      }),
      fetch('/api/jobs').then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setMatches(data.matches);
      }),
    ])
      .catch((error) => setError(error.message))
      .finally(() => setReady(true));
  }, []);
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setWarnings([]);
    try {
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location,
          remote: remote ? true : undefined,
          page: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setWarnings(data.errors);
      setSearched(true);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }
  async function update(jobId: string, status: 'SAVED' | 'HIDDEN' | null) {
    setError('');
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMatches((current) =>
        current.map((match) =>
          match.job.id === jobId ? { ...match, status } : match,
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update failed.');
    }
  }
  const visible = matches.filter(
    (match) =>
      match.status !== 'HIDDEN' &&
      match.score >= minScore &&
      (!source || match.job.source === source) &&
      (!saved || match.status === 'SAVED') &&
      (!remote || match.job.remote),
  );
  return (
    <div className="max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
        Find your next possibility
      </p>
      <h1 className="text-3xl font-semibold">Jobs for your next chapter</h1>
      <p className="my-4 text-sm leading-6 text-slate-500">
        Search multiple sources, then compare explainable profile matches.
        Scores are guidance, not hiring predictions.{' '}
        <Link className="text-teal-800 underline" href="/dashboard/resume">
          Update your profile
        </Link>{' '}
        to improve your matches.
      </p>
      <form onSubmit={search} className="panel mb-5">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold">
            Role or keywords
            <input
              className="input"
              value={query}
              maxLength={200}
              placeholder="Software Engineer"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Location
            <input
              className="input"
              value={location}
              maxLength={200}
              placeholder="City, region, or leave blank"
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy || !ready}>
            {busy ? 'Searching…' : 'Search sources →'}
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Public boards use keyword/location filtering. Clear location to
          broaden your search. New results are added to your existing matches;
          hidden jobs stay hidden.
        </p>
      </form>
      <div className="panel mb-6 flex flex-wrap items-center gap-5 text-sm">
        <label>
          Minimum score{' '}
          <input
            aria-label="Minimum score"
            className="ml-2 w-16 rounded border p-2"
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>
        <label>
          Source{' '}
          <select
            className="ml-2 rounded border p-2"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All sources</option>
            {['adzuna', 'jsearch', 'greenhouse', 'lever', 'mock'].map(
              (source) => (
                <option key={source}>{source}</option>
              ),
            )}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={remote}
            onChange={(e) => setRemote(e.target.checked)}
          />
          Remote only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
          />
          Saved only
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {warnings.length > 0 && (
        <aside
          aria-label="Source notices"
          className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {warnings.map((warning) => (
            <p key={warning.source}>
              <strong>{warning.source}:</strong> {warning.message}
            </p>
          ))}
        </aside>
      )}
      <p aria-live="polite" className="mb-4 text-sm text-slate-500">
        {!ready
          ? 'Loading your matches…'
          : `${visible.length} matches${searched ? ' · Search complete' : ''}`}
      </p>
      <div className="space-y-4">
        {visible.map((match) => (
          <article key={match.id} className="panel">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="mb-3 flex gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1">
                    {match.job.source === 'mock'
                      ? 'MOCK · DEMO'
                      : match.job.source}
                  </span>
                  {match.job.remote && (
                    <span className="rounded bg-teal-50 px-2 py-1 text-teal-900">
                      Remote
                    </span>
                  )}
                </div>
                <Link
                  href={`/dashboard/jobs/${match.job.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {match.job.title}
                </Link>
                <p className="mt-2 text-sm text-slate-500">
                  {match.job.company} ·{' '}
                  {match.job.location || 'Location not provided'}
                </p>
              </div>
              <span className="rounded-xl bg-teal-50 px-3 py-2 text-center text-teal-900">
                <strong className="text-xl">{match.score}</strong>
                <span className="block text-[10px]">MATCH / 100</span>
              </span>
            </div>
            <p className="my-4 line-clamp-2 text-sm leading-6 text-slate-600">
              {match.job.description}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {match.matchedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-900"
                >
                  ✓ {skill}
                </span>
              ))}
              {match.missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900"
                >
                  Missing: {skill}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <button
                className="font-semibold text-teal-800"
                onClick={() =>
                  update(
                    match.job.id,
                    match.status === 'SAVED' ? null : 'SAVED',
                  )
                }
              >
                {match.status === 'SAVED' ? '✓ Saved · Unsave' : 'Save job'}
              </button>
              <button
                className="text-slate-500"
                onClick={() => update(match.job.id, 'HIDDEN')}
              >
                Hide
              </button>
              <a
                href={match.job.url}
                rel="noopener noreferrer"
                target="_blank"
                className="ml-auto font-semibold text-teal-800"
              >
                Original posting ↗
              </a>
            </div>
          </article>
        ))}
      </div>
      {ready && !visible.length && (
        <section className="panel text-sm text-slate-500">
          No matches to display. Search sources, clear filters, or broaden your
          keywords/location. A resume profile is required to score jobs.
        </section>
      )}
    </div>
  );
}
