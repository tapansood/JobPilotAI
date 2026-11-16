import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/service';
import WorkspaceNavigation from './navigation';
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-screen md:flex">
      <aside className="shrink-0 border-b border-slate-200 bg-white p-5 md:w-64 md:border-b-0 md:border-r md:p-7">
        <Link href="/dashboard" className="text-xl font-bold">
          JobPilot<span className="text-teal-700">AI</span>
        </Link>
        <p className="mb-4 mt-2 text-xs text-slate-500 md:mb-8">
          YOUR CAREER WORKSPACE
        </p>
        <WorkspaceNavigation />
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 md:mt-12 md:block md:pt-5">
          <p
            className="min-w-0 truncate text-xs text-slate-500"
            title={user.email || user.phone || ''}
          >
            {user.email || user.phone}
          </p>
          <form action="/api/auth/logout" method="POST" className="shrink-0">
            <button className="text-sm font-semibold text-teal-800 md:mt-4">
              Sign out ↗
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-12">{children}</main>
    </div>
  );
}
