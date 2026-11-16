export default function Dashboard() {
  return (
    <div className="max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
        A little direction. A lot of possibility.
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to your next chapter.
      </h1>
      <p className="mb-10 mt-3 text-slate-500">
        Your workspace is ready. Let’s build your momentum.
      </p>
      <section className="mb-8 rounded-2xl bg-teal-950 p-8 text-white">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-teal-200">
          EARLY PREVIEW
        </span>
        <h2 className="mb-3 mt-6 text-2xl font-semibold">
          One home for your job search.
        </h2>
        <p className="max-w-xl text-sm leading-6 text-teal-100/80">
          You’ve taken the first step. Upload your resume to build your profile.
          Explore scored job matches in Jobs, tailor a factual resume, and draft
          outreach to your contacts. Application tracking is coming next.
        </p>
      </section>
      <h2 className="mb-5 text-lg font-semibold">Your workspace</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          [
            '01',
            'Your resume, working harder',
            'Build a profile and prepare application-specific resume drafts.',
          ],
          [
            '02',
            'Find the right fit',
            'Bring relevant opportunities together without the tab overload.',
          ],
          [
            '03',
            'Every application, organized',
            'Keep track of your next steps and the progress you’ve made.',
          ],
          [
            '04',
            'A stronger network',
            'Prepare personal outreach you can review and send yourself.',
          ],
        ].map(([n, title, text]) => (
          <article className="panel" key={n}>
            <span className="text-xs font-bold text-teal-700">
              {n} / {n === '03' ? 'PLANNED' : 'AVAILABLE'}
            </span>
            <h3 className="mb-2 mt-4 font-semibold">{title}</h3>
            <p className="text-sm leading-6 text-slate-500">{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
