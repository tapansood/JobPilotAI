import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  user: vi.fn(),
  find: vi.fn(),
  list: vi.fn(),
  documents: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  letter: vi.fn(),
}));
vi.mock('@/lib/auth/service', () => ({
  currentUser: m.user,
  AuthError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock('@/lib/db', () => ({
  db: {
    application: { findMany: m.list, findFirst: m.find },
    tailoredResume: { findMany: m.documents },
    coverLetter: { findMany: m.documents, findFirst: m.letter },
  },
}));
vi.mock('@/lib/applications/service', () => ({
  saveApplication: m.save,
  deleteApplication: m.remove,
  ApplicationError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));
import { GET, POST } from './route';
import { GET as detail, PATCH, DELETE } from './[id]/route';
import { GET as download } from '../cover-letters/[id]/download/route';
import { ApplicationError } from '@/lib/applications/service';
const params = { params: Promise.resolve({ id: 'application' }) };
const request = (body: unknown = {}) =>
  new Request('http://localhost:3000/api/applications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: 'owner' });
  m.list.mockResolvedValue([]);
  m.find.mockResolvedValue(null);
  m.documents.mockResolvedValue([]);
  m.save.mockResolvedValue({
    created: true,
    application: { id: 'application' },
  });
});
afterEach(() => vi.restoreAllMocks());
it('requires sessions for all CRUD and linked cover letter downloads', async () => {
  m.user.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect((await POST(request())).status).toBe(401);
  for (const route of [detail, PATCH, DELETE, download])
    expect((await route(request(), params)).status).toBe(401);
  expect(m.find).not.toHaveBeenCalled();
  expect(m.save).not.toHaveBeenCalled();
});
it('scopes empty lists and detail/timeline/document reads to the current user', async () => {
  expect(
    await (
      await GET(new Request('http://localhost:3000/api/applications?jobId=job'))
    ).json(),
  ).toEqual({ applications: [] });
  expect(m.list.mock.calls[0][0].where).toEqual({
    userId: 'owner',
    jobId: 'job',
  });
  expect((await detail(request(), params)).status).toBe(404);
  m.find.mockResolvedValue({ id: 'application', jobId: 'job', events: [] });
  expect((await detail(request(), params)).status).toBe(200);
  expect(m.find.mock.calls[1][0].where).toEqual({
    id: 'application',
    userId: 'owner',
  });
  expect(m.documents.mock.calls[0][0].where).toEqual({
    userId: 'owner',
    jobId: 'job',
  });
});
it('creates/upserts, updates and deletes using only the session owner', async () => {
  expect(
    (await POST(request({ company: 'Acme', title: 'Engineer' }))).status,
  ).toBe(201);
  expect(m.save).toHaveBeenCalledWith('owner', {
    company: 'Acme',
    title: 'Engineer',
  });
  m.save.mockResolvedValue({
    created: false,
    application: { id: 'application' },
  });
  expect((await POST(request({ jobId: 'job' }))).status).toBe(200);
  expect((await PATCH(request({ status: 'APPLIED' }), params)).status).toBe(
    200,
  );
  expect(m.save).toHaveBeenCalledWith(
    'owner',
    { status: 'APPLIED' },
    'application',
  );
  expect((await DELETE(request(), params)).status).toBe(200);
  expect(m.remove).toHaveBeenCalledWith('owner', 'application');
});
it('rejects injected owners, unsafe fields, missing ownership and storage failures', async () => {
  expect((await POST(request({ userId: 'other' }))).status).toBe(400);
  expect(
    (await PATCH(request({ url: 'javascript:alert(1)' }), params)).status,
  ).toBe(400);
  m.save.mockRejectedValue(new ApplicationError('Application not found.', 404));
  expect((await PATCH(request({ status: 'OFFER' }), params)).status).toBe(404);
  m.remove.mockRejectedValue(
    new ApplicationError('Application not found.', 404),
  );
  expect((await DELETE(request(), params)).status).toBe(404);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.save.mockRejectedValue(new Error('unavailable'));
  expect((await POST(request({ jobId: 'job' }))).status).toBe(500);
});
it('downloads cover letters with private attachments and rejects other users records', async () => {
  m.letter.mockResolvedValue(null);
  expect((await download(request(), params)).status).toBe(404);
  m.letter.mockResolvedValue({ body: 'Dear Hiring Team' });
  const response = await download(request(), params);
  expect(await response.text()).toBe('Dear Hiring Team');
  expect(response.headers.get('Content-Disposition')).toContain('.txt');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(m.letter).toHaveBeenCalledWith({
    where: { id: 'application', userId: 'owner' },
  });
});
