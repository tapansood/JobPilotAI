import Link from 'next/link';
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-7">
        <Link href="/" className="text-xl font-bold tracking-tight">
          JobPilot<span className="text-teal-700">AI</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold">
          Sign in ↗
        </Link>
      </header>
      <section className="grid gap-14 py-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-6 text-xs font-bold uppercase tracking-[.2em] text-teal-700">
            A fresh start. A clearer path.
          </p>
          <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight md:text-6xl">
            Your next chapter.
            <br />
            <span className="text-teal-700">Not another job board.</span>
          </h1>
          <p className="my-7 max-w-lg text-lg leading-relaxed text-slate-600">
            Losing a job is hard. Finding your next one shouldn’t mean managing
            a dozen tabs. Bring your experience, opportunities, and connections
            into one calm workspace.
          </p>
          <Link href="/login" className="button">
            Create your workspace <span className="ml-6">→</span>
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            Passwordless sign-in · Built for your next move
          </p>
        </div>
        <div className="rounded-3xl bg-teal-950 p-8 text-white shadow-xl">
          <div className="mb-9 flex justify-between text-xs text-teal-200">
            <span>YOUR JOB SEARCH, REIMAGINED</span>
            <span>✦</span>
          </div>
          <h2 className="mb-2 text-2xl font-semibold">
            Less busywork. More possibility.
          </h2>
          <p className="mb-7 text-sm leading-6 text-teal-100/70">
            A focused workspace to help you move forward, one meaningful step at
            a time.
          </p>
          {[
            'Your story, clearly told',
            'Opportunities that fit you',
            'Connections that open doors',
          ].map((text, i) => (
            <div
              className="mb-3 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
              key={text}
            >
              <span className="text-teal-300">0{i + 1}</span>
              <span className="text-sm">{text}</span>
            </div>
          ))}
          <p className="mt-7 text-xs text-teal-200/70">
            Early preview · Features rolling out in stages
          </p>
        </div>
      </section>
      <section className="grid gap-6 border-t border-slate-200 py-12 md:grid-cols-3">
        {[
          [
            '01 / EXPERIENCE',
            'Start with your story',
            'Upload your resume and build an editable profile that represents what you bring.',
          ],
          [
            '02 / OPPORTUNITY',
            'Find your direction',
            'Discover relevant roles across sources, see how your skills match, and tailor a factual application draft.',
          ],
          [
            '03 / MOMENTUM',
            'Keep moving forward',
            'Import contacts, prepare thoughtful outreach, and track applications and follow-ups. You review and send everything yourself.',
          ],
        ].map(([label, title, text]) => (
          <article key={label}>
            <p className="mb-4 text-xs font-bold tracking-wider text-teal-700">
              {label}
            </p>
            <h2 className="mb-3 text-xl font-semibold">{title}</h2>
            <p className="text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>
      <footer className="border-t py-6 text-xs text-slate-500">
        JobPilotAI · Your career, with you in control. No automatic applications
        or messages.
      </footer>
    </main>
  );
}
