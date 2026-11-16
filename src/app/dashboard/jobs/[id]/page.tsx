import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/service';
import { db } from '@/lib/db';
import { plain, safeUrl } from '@/lib/jobs/sources/shared';
export default async function JobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const match = await db.jobMatch.findUnique({
    where: { userId_jobId: { userId: user.id, jobId: id } },
    include: { job: true },
  });
  if (!match) notFound();
  const job = match.job;
  const reasons = match.reasons as Record<
    string,
    { text: string; points: number; weight: number }
  >;
  return (
    <article className="max-w-4xl">
      <Link
        href="/dashboard/jobs"
        className="text-sm font-semibold text-teal-800"
      >
        ← Back to jobs
      </Link>
      <div className="panel mt-6">
        <p className="mb-3 text-xs uppercase text-teal-700">
          {job.source === 'mock'
            ? 'Mock · demo posting — not a real vacancy'
            : job.source}{' '}
          · {match.score}/100 match
        </p>
        <h1 className="text-3xl font-semibold">{job.title}</h1>
        <p className="my-3 text-slate-500">
          {job.company} · {job.location} {job.remote ? '· Remote' : ''}
        </p>
        <p className="text-sm text-slate-500">
          {job.employmentType}{' '}
          {job.postedAt ? `· Posted ${job.postedAt.toLocaleDateString()}` : ''}
        </p>
        {(job.salaryMin !== null || job.salaryMax !== null) && (
          <p className="mt-3 text-sm">
            Reported salary: {job.salaryMin?.toLocaleString() ?? '?'} –{' '}
            {job.salaryMax?.toLocaleString() ?? '?'} {job.currency} (confirm
            period and eligibility with source)
          </p>
        )}
        <a
          className="button mt-6"
          href={safeUrl(job.url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          View original posting ↗
        </a>
        <h2 className="mb-3 mt-8 text-lg font-semibold">Why this matches</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          {Object.entries(reasons).map(([key, reason]) => (
            <li key={key}>
              <strong className="capitalize">
                {key}: {reason.points}/{reason.weight}
              </strong>{' '}
              · {reason.text}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-teal-800">
          Matched skills: {match.matchedSkills.join(', ') || 'None detected'}
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Missing skills: {match.missingSkills.join(', ') || 'None detected'}
        </p>
        <h2 className="mb-4 mt-8 text-lg font-semibold">Full description</h2>
        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
          {plain(job.description)}
        </div>
      </div>
    </article>
  );
}
