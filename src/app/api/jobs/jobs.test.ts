import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  user: vi.fn(),
  search: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/auth/service', () => ({
  currentUser: m.user,
  AuthError: class extends Error {
    status = 403;
  },
}));
vi.mock('@/lib/jobs/service', () => ({ searchForUser: m.search }));
vi.mock('@/lib/db', () => ({
  db: { jobMatch: { findMany: m.find, updateMany: m.update } },
}));
import { POST } from './search/route';
import { GET } from './route';
import { PATCH } from './[id]/route';
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: 'owner' });
  m.find.mockResolvedValue([]);
});
const request = (body: unknown) =>
  new Request('http://localhost:3000/api/jobs/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });
it('requires sign-in for search/list/update', async () => {
  m.user.mockResolvedValue(null);
  expect((await POST(request({}))).status).toBe(401);
  expect(
    (await GET(new Request('http://localhost:3000/api/jobs'))).status,
  ).toBe(401);
  expect(
    (
      await PATCH(request({ status: 'SAVED' }), {
        params: Promise.resolve({ id: 'job' }),
      })
    ).status,
  ).toBe(401);
});
it('scopes searches and reports missing profile or invalid input', async () => {
  m.search.mockResolvedValue({ matches: [], errors: [] });
  expect((await POST(request({ query: 'Java' }))).status).toBe(200);
  expect(m.search).toHaveBeenCalledWith('owner', { query: 'Java' });
  m.search.mockResolvedValue(null);
  expect((await POST(request({}))).status).toBe(409);
  expect((await POST(request({ page: -1 }))).status).toBe(400);
});
it('scopes filtered reads and rejects invalid filters', async () => {
  const response = await GET(
    new Request(
      'http://localhost:3000/api/jobs?minScore=50&remote=true&saved=true&source=mock',
    ),
  );
  expect(await response.json()).toEqual({ matches: [] });
  expect(m.find.mock.calls[0][0].where).toMatchObject({
    userId: 'owner',
    score: { gte: 50 },
    status: 'SAVED',
    job: { source: 'mock', remote: true },
  });
  expect(
    (await GET(new Request('http://localhost:3000/api/jobs?minScore=101')))
      .status,
  ).toBe(400);
});
it('updates only owned matches and handles missing records/invalid status', async () => {
  m.update.mockResolvedValue({ count: 1 });
  expect(
    (
      await PATCH(request({ status: 'SAVED' }), {
        params: Promise.resolve({ id: 'job' }),
      })
    ).status,
  ).toBe(200);
  expect(m.update).toHaveBeenCalledWith({
    where: { userId: 'owner', jobId: 'job' },
    data: { status: 'SAVED' },
  });
  m.update.mockResolvedValue({ count: 0 });
  expect(
    (
      await PATCH(request({ status: 'HIDDEN' }), {
        params: Promise.resolve({ id: 'other' }),
      })
    ).status,
  ).toBe(404);
  expect(
    (
      await PATCH(request({ status: 'BAD' }), {
        params: Promise.resolve({ id: 'job' }),
      })
    ).status,
  ).toBe(400);
});
