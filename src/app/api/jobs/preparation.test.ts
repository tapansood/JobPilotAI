import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  user: vi.fn(),
  match: vi.fn(),
  profile: vi.fn(),
  tailor: vi.fn(),
  cover: vi.fn(),
  tailoredCreate: vi.fn(),
  tailoredFind: vi.fn(),
  tailoredUpdate: vi.fn(),
  coverCreate: vi.fn(),
  coverFind: vi.fn(),
  draftCreate: vi.fn(),
  draftFind: vi.fn(),
  contacts: vi.fn(),
  pdf: vi.fn(),
  docx: vi.fn(),
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
    jobMatch: { findUnique: m.match },
    profile: { findUnique: m.profile },
    tailoredResume: {
      create: m.tailoredCreate,
      findFirst: m.tailoredFind,
      update: m.tailoredUpdate,
    },
    coverLetter: { create: m.coverCreate, findFirst: m.coverFind },
    outreachDraft: { create: m.draftCreate, findMany: m.draftFind },
    $transaction: async (promises: Promise<unknown>[]) => Promise.all(promises),
  },
}));
vi.mock('@/lib/tailor', () => ({
  tailorResume: m.tailor,
  generateCoverLetter: m.cover,
}));
vi.mock('@/lib/tailor/export', () => ({
  exportPdf: m.pdf,
  exportDocx: m.docx,
}));
vi.mock('@/lib/contacts/service', () => ({ companyContacts: m.contacts }));
import { POST as tailor } from './[id]/tailor/route';
import { POST as cover } from './[id]/cover-letter/route';
import { POST as outreach } from './[id]/outreach/route';
import { GET as preparation } from './[id]/preparation/route';
import { PUT as update } from '../tailored/[id]/route';
import { GET as download } from '../tailored/[id]/download/route';
import { profile, job } from '@/lib/tailor/fixtures';
import { deterministicTailor } from '@/lib/tailor/content';
const params = { params: Promise.resolve({ id: 'job' }) };
const tailoredParams = { params: Promise.resolve({ id: 'tailored' }) };
const request = (body?: unknown) =>
  new Request('http://localhost:3000/api/jobs/job', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const content = deterministicTailor(profile, job);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('APP_URL', 'http://localhost:3000');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.user.mockResolvedValue({ id: 'owner' });
  m.match.mockResolvedValue({ job });
  m.profile.mockResolvedValue(profile);
  m.tailor.mockResolvedValue(content);
  m.cover.mockResolvedValue('Factual cover letter');
  m.tailoredCreate.mockImplementation(async ({ data }) => ({
    id: 'tailored',
    ...data,
  }));
  m.coverCreate.mockImplementation(async ({ data }) => ({
    id: 'letter',
    ...data,
  }));
  m.draftCreate.mockImplementation(async ({ data }) => ({
    id: 'draft',
    ...data,
  }));
  m.tailoredFind.mockResolvedValue(null);
  m.coverFind.mockResolvedValue(null);
  m.draftFind.mockResolvedValue([]);
  m.contacts.mockResolvedValue([]);
  m.tailoredUpdate.mockImplementation(async ({ data }) => ({
    id: 'tailored',
    ...data,
  }));
  m.pdf.mockResolvedValue(Buffer.from('%PDF-test'));
  m.docx.mockResolvedValue(Buffer.from('PK-test'));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('requires a session for every preparation, edit, and download route', async () => {
  m.user.mockResolvedValue(null);
  for (const route of [tailor, cover, outreach, preparation])
    expect((await route(request(), params)).status).toBe(401);
  expect((await update(request(content), tailoredParams)).status).toBe(401);
  expect(
    (
      await download(
        new Request(
          'http://localhost:3000/api/tailored/tailored/download?format=pdf',
        ),
        tailoredParams,
      )
    ).status,
  ).toBe(401);
  expect(m.match).not.toHaveBeenCalled();
  expect(m.tailoredCreate).not.toHaveBeenCalled();
});
it('creates user-owned tailored resumes and cover letters from an owned match/profile', async () => {
  expect((await tailor(request(), params)).status).toBe(201);
  expect(m.match).toHaveBeenCalledWith({
    where: { userId_jobId: { userId: 'owner', jobId: 'job' } },
    include: { job: true },
  });
  expect(m.profile).toHaveBeenCalledWith({ where: { userId: 'owner' } });
  expect(m.tailoredCreate).toHaveBeenCalledWith({
    data: { userId: 'owner', jobId: 'job', content },
  });
  expect((await cover(request(), params)).status).toBe(201);
  expect(m.coverCreate).toHaveBeenCalledWith({
    data: { userId: 'owner', jobId: 'job', body: 'Factual cover letter' },
  });
});
it('rejects absent or other users jobs and missing profiles without creating drafts', async () => {
  m.match.mockResolvedValue(null);
  for (const route of [tailor, cover, outreach, preparation])
    expect((await route(request(), params)).status).toBe(404);
  expect(m.tailoredCreate).not.toHaveBeenCalled();
  expect(m.draftCreate).not.toHaveBeenCalled();
  m.match.mockResolvedValue({ job });
  m.profile.mockResolvedValue(null);
  expect((await tailor(request(), params)).status).toBe(404);
});
it('returns empty preparation state and scopes all persisted material reads', async () => {
  const response = await preparation(request(), params);
  expect(await response.json()).toEqual({
    tailored: null,
    coverLetter: null,
    drafts: [],
    contacts: [],
  });
  for (const find of [m.tailoredFind, m.coverFind, m.draftFind])
    expect(find.mock.calls[0][0].where).toEqual({
      userId: 'owner',
      jobId: 'job',
    });
  expect(m.contacts).toHaveBeenCalledWith('owner', job.company);
});
it('generates a cold email and same-company contact referral drafts scoped to the owner', async () => {
  const contact = { id: 'contact', firstName: 'Alex' };
  m.contacts.mockResolvedValue([contact]);
  const response = await outreach(request(), params);
  const data = await response.json();
  expect(response.status).toBe(201);
  expect(data.drafts).toHaveLength(3);
  expect(
    data.drafts.map((draft: { contactId: string | null }) => draft.contactId),
  ).toEqual([null, 'contact', 'contact']);
  for (const [input] of m.draftCreate.mock.calls)
    expect(input.data).toMatchObject({ userId: 'owner', jobId: 'job' });
  m.contacts.mockResolvedValue([]);
  const empty = await outreach(request(), params);
  expect((await empty.json()).drafts).toHaveLength(1);
});
it('saves approved text changes but rejects unsupported qualifications and malformed content', async () => {
  m.tailoredFind.mockResolvedValue({ id: 'tailored', jobId: 'job', content });
  const edited = { ...content, summary: profile.summary, skills: ['Docker'] };
  expect((await update(request(edited), tailoredParams)).status).toBe(200);
  expect(m.tailoredFind).toHaveBeenCalledWith({
    where: { id: 'tailored', userId: 'owner' },
  });
  expect(m.tailoredUpdate.mock.calls[0][0].data.content.skills).toEqual([
    'Docker',
  ]);
  expect(
    (await update(request({ ...edited, skills: ['Python'] }), tailoredParams))
      .status,
  ).toBe(422);
  expect((await update(request({ summary: 12 }), tailoredParams)).status).toBe(
    400,
  );
  m.tailoredFind.mockResolvedValue(null);
  expect((await update(request(content), tailoredParams)).status).toBe(404);
});
it('downloads only owned validated records with private typed attachments', async () => {
  m.tailoredFind.mockResolvedValue({ content });
  for (const format of ['pdf', 'docx']) {
    const response = await download(
      new Request(
        `http://localhost:3000/api/tailored/tailored/download?format=${format}`,
      ),
      tailoredParams,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain(
      `resume.${format}`,
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Content-Type')).toBe(
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }
  expect(m.tailoredFind).toHaveBeenCalledWith({
    where: { id: 'tailored', userId: 'owner' },
  });
  expect(
    (
      await download(
        new Request('http://localhost:3000/?format=exe'),
        tailoredParams,
      )
    ).status,
  ).toBe(400);
  m.tailoredFind.mockResolvedValue(null);
  expect(
    (
      await download(
        new Request('http://localhost:3000/?format=pdf'),
        tailoredParams,
      )
    ).status,
  ).toBe(404);
  m.tailoredFind.mockResolvedValue({ content: {} });
  expect(
    (
      await download(
        new Request('http://localhost:3000/?format=pdf'),
        tailoredParams,
      )
    ).status,
  ).toBe(500);
});
it('handles provider failures and blocks cross-origin generation', async () => {
  m.tailor.mockRejectedValue(new Error('provider failed'));
  expect((await tailor(request(), params)).status).toBe(500);
  expect(m.tailoredCreate).not.toHaveBeenCalled();
  expect(
    (
      await cover(
        new Request('http://localhost:3000/', {
          method: 'POST',
          headers: { origin: 'https://evil.test' },
        }),
        params,
      )
    ).status,
  ).toBe(403);
});
