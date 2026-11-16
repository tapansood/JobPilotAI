import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/service';
import { db } from '@/lib/db';
import { profileSchema } from '@/lib/profile/schema';
import { canonicalStatuses } from '@/lib/jobs/status';
import { fingerprint } from '@/lib/jobs/dedupe';
import {
  profileCompleteness,
  applicationStats,
} from '@/lib/applications/stats';
export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const [profile, matches, applications] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.jobMatch.findMany({
      where: { userId: user.id },
      include: { job: true },
    }),
    db.application.findMany({
      where: { userId: user.id },
      select: { status: true, nextFollowUpAt: true },
    }),
  ]);
  const parsed = profileSchema.safeParse(profile);
  const completeness = profileCompleteness(parsed.success ? parsed.data : null);
  const matchCount = new Set(
    canonicalStatuses(matches)
      .filter((match) => match.status !== 'HIDDEN')
      .map((match) => fingerprint(match.job)),
  ).size;
  const stats = applicationStats(applications);
  return (
    <div className="max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
        Your career workspace
      </p>
      <h1 className="text-3xl font-semibold">Welcome to your next chapter.</h1>
      <p className="my-4 text-slate-500">
        Your profile, opportunities, and next steps in one place.
      </p>
      <div className="my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Profile completeness', `${completeness}%`, '/dashboard/resume'],
          ['Unique visible matches', String(matchCount), '/dashboard/jobs'],
          [
            'Applications tracked',
            String(stats.total),
            '/dashboard/applications',
          ],
          [
            'Follow-ups due today',
            String(stats.dueToday),
            '/dashboard/applications',
          ],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="panel">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-teal-900">{value}</p>
          </Link>
        ))}
      </div>
      <section className="panel">
        <h2 className="text-xl font-semibold">Applications by status</h2>
        <div className="my-5 grid gap-4 sm:grid-cols-3">
          {Object.entries(stats.counts).map(([status, count]) => (
            <div key={status} className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{status}</p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/applications"
          className="text-sm font-semibold text-teal-800 underline"
        >
          Open application board →
        </Link>
      </section>
      <p
        className={`my-5 text-sm ${stats.overdue ? 'font-semibold text-red-800' : 'text-slate-500'}`}
      >
        {stats.overdue} overdue follow-up{stats.overdue === 1 ? '' : 's'}. Due
        dates use UTC and exclude rejected/withdrawn applications.
      </p>
      <p className="text-xs leading-6 text-slate-500">
        Profile completeness checks ten fields: headline, summary, skills,
        titles, experience years, location, seniority, work history, education,
        and a contact email or phone. It measures filled fields, not quality.
      </p>
      <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-teal-800">
        <Link href="/dashboard/resume">Review resume →</Link>
        <Link href="/dashboard/jobs">Find jobs →</Link>
        <Link href="/dashboard/contacts">Manage contacts →</Link>
        <Link href="/dashboard/settings">Integration settings →</Link>
      </div>
    </div>
  );
}
