export const workspaceLinks = [
  ['Overview', '/dashboard'],
  ['Resume', '/dashboard/resume'],
  ['Jobs', '/dashboard/jobs'],
  ['Contacts', '/dashboard/contacts'],
  ['Applications', '/dashboard/applications'],
  ['Settings', '/dashboard/settings'],
] as const;
export function isWorkspaceLinkActive(path: string, href: string) {
  return (
    path === href || (href !== '/dashboard' && path.startsWith(`${href}/`))
  );
}
