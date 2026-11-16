import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/service';
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-r border-slate-200 bg-white p-7 md:w-64">
        <Link href="/dashboard" className="text-xl font-bold">
          JobPilot<span className="text-teal-700">AI</span>
        </Link>
        <p className="mb-8 mt-2 text-xs text-slate-400">
          YOUR CAREER WORKSPACE
        </p>
        <nav aria-label="Workspace" className="space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/resume"
            className="block rounded-xl p-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
          >
            Resume
          </Link>
          <Link
            href="/dashboard/jobs"
            className="block rounded-xl p-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
          >
            Jobs
          </Link>
          <Link
            href="/dashboard/contacts"
            className="block rounded-xl p-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
          >
            Contacts
          </Link>
          {['Applications', 'Settings'].map((name) => (
            <Link
              key={name}
              href={`/dashboard/${name.toLowerCase()}`}
              className="block rounded-xl p-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
            >
              <span>{name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-12 border-t pt-5">
          <p className="break-all text-xs text-slate-500">
            {user.email || user.phone}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button className="mt-4 text-sm font-semibold text-teal-800">
              Sign out ↗
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-12">{children}</main>
    </div>
  );
}
