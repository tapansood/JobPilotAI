'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { workspaceLinks, isWorkspaceLinkActive } from '@/lib/navigation';
export default function WorkspaceNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workspace"
      className="grid grid-cols-3 gap-1 md:grid-cols-1 md:gap-2"
    >
      {workspaceLinks.map(([name, href]) => {
        const active = isWorkspaceLinkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-2 py-3 text-center text-xs font-semibold text-teal-900 md:p-3 md:text-left md:text-sm ${active ? 'bg-teal-50 ring-1 ring-inset ring-teal-100' : 'hover:bg-slate-50'}`}
          >
            {name}
          </Link>
        );
      })}
    </nav>
  );
}
