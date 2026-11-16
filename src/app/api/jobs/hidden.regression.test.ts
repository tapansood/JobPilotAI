import { expect, it, vi } from 'vitest';
const find = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/service', () => ({
  currentUser: async () => ({ id: 'owner' }),
  AuthError: class extends Error {},
}));
vi.mock('@/lib/db', () => ({ db: { jobMatch: { findMany: find } } }));
import { GET } from './route';
it('hides fingerprint duplicates even when filtering to a different source', async () => {
  const job = {
    company: 'Acme',
    title: 'Engineer',
    location: 'Remote',
    source: 'original',
    remote: true,
  };
  find.mockResolvedValue([
    { id: 'hidden', status: 'HIDDEN', score: 90, job },
    {
      id: 'duplicate',
      status: null,
      score: 80,
      job: { ...job, source: 'new' },
    },
  ]);
  const response = await GET(
    new Request('http://localhost:3000/api/jobs?source=new'),
  );
  expect(await response.json()).toEqual({ matches: [] });
});
