import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  user: vi.fn(),
  extract: vi.fn(),
  parse: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  lock: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  upsert: vi.fn(),
  findProfile: vi.fn(),
  findResume: vi.fn(),
}));
vi.mock('@/lib/auth/service', () => ({
  currentUser: m.user,
  AuthError: class extends Error {
    status = 403;
  },
}));
vi.mock('@/lib/profile/extract', () => ({
  extractResume: m.extract,
  MAX_UPLOAD_BYTES: 5 * 1024 * 1024,
}));
vi.mock('@/lib/profile/parse', () => ({ parseProfile: m.parse }));
vi.mock('@/lib/storage', () => ({ storage: { put: m.put, remove: m.remove } }));
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: (work: (tx: unknown) => unknown) =>
      work({
        $queryRaw: m.lock,
        resume: { updateMany: m.update, create: m.create },
        profile: { upsert: m.upsert },
      }),
    profile: { findUnique: m.findProfile, upsert: m.upsert },
    resume: { findFirst: m.findResume },
  },
}));
import { POST } from './route';
import { GET, PUT } from '../profile/route';
const profile = {
  headline: 'Engineer',
  summary: 'Summary',
  skills: ['Java'],
  titles: [],
  yearsExperience: 2,
  locations: [],
  seniority: '',
  experience: [],
  education: [],
};
function upload(file = true) {
  const body = new FormData();
  if (file)
    body.set(
      'file',
      new File(['%PDF-test'], 'resume.pdf', { type: 'application/pdf' }),
    );
  return new Request('http://localhost:3000/api/resume', {
    method: 'POST',
    body,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: 'owner' });
  m.extract.mockResolvedValue({
    rawText: 'resume text',
    mimeType: 'application/pdf',
  });
  m.parse.mockResolvedValue(profile);
  m.put.mockResolvedValue('key');
  m.remove.mockResolvedValue(undefined);
  m.create.mockResolvedValue({ id: 'resume' });
  m.upsert.mockResolvedValue(profile);
});
it('requires a user for all operations', async () => {
  m.user.mockResolvedValue(null);
  expect((await POST(upload())).status).toBe(401);
  expect((await GET()).status).toBe(401);
  expect(
    (
      await PUT(
        new Request('http://localhost:3000', { method: 'PUT', body: '{}' }),
      )
    ).status,
  ).toBe(401);
  expect(m.put).not.toHaveBeenCalled();
});
it('uploads and atomically saves only for the current user', async () => {
  const response = await POST(upload());
  expect(response.status).toBe(201);
  expect((await response.json()).profile.headline).toBe('Engineer');
  expect(m.update).toHaveBeenCalledWith({
    where: { userId: 'owner', isPrimary: true },
    data: { isPrimary: false },
  });
  expect(m.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ userId: 'owner', storageKey: 'key' }),
    }),
  );
});
it('rejects missing files, extraction errors and invalid profiles', async () => {
  expect((await POST(upload(false))).status).toBe(400);
  m.extract.mockRejectedValue(new Error('Invalid PDF'));
  expect((await POST(upload())).status).toBe(422);
  m.extract.mockResolvedValue({ rawText: 'text', mimeType: 'application/pdf' });
  m.parse.mockRejectedValue(new Error('schema error'));
  expect((await POST(upload())).status).toBe(422);
  expect(m.put).not.toHaveBeenCalled();
});
it('removes storage files if database save fails', async () => {
  m.upsert.mockRejectedValue(new Error('db failure'));
  expect((await POST(upload())).status).toBe(500);
  expect(m.remove).toHaveBeenCalledWith('key');
});
it('returns empty profiles and scopes reads and edits to the session identity', async () => {
  m.findProfile.mockResolvedValue(null);
  m.findResume.mockResolvedValue(null);
  expect(await (await GET()).json()).toEqual({ profile: null, resume: null });
  expect(m.findProfile).toHaveBeenCalledWith({ where: { userId: 'owner' } });
  const response = await PUT(
    new Request('http://localhost:3000', {
      method: 'PUT',
      body: JSON.stringify({ ...profile, userId: 'someone-else' }),
    }),
  );
  expect(response.status).toBe(200);
  expect(m.upsert).toHaveBeenCalledWith({
    where: { userId: 'owner' },
    create: { userId: 'owner', ...profile },
    update: profile,
  });
  expect(
    (
      await PUT(
        new Request('http://localhost:3000', { method: 'PUT', body: '{}' }),
      )
    ).status,
  ).toBe(400);
});
