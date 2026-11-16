import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  lock: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  events: vi.fn(),
  match: vi.fn(),
  resume: vi.fn(),
  letter: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        $queryRaw: m.lock,
        application: {
          findFirst: m.find,
          create: m.create,
          update: m.update,
          deleteMany: m.remove,
        },
        applicationEvent: { createMany: m.events },
        jobMatch: { findUnique: m.match },
        tailoredResume: { findFirst: m.resume },
        coverLetter: { findFirst: m.letter },
      }),
  },
}));
import { saveApplication, deleteApplication } from './service';
const existing = {
  id: 'application',
  userId: 'owner',
  jobId: 'job',
  company: 'Acme',
  title: 'Engineer',
  url: '',
  status: 'INTERVIEW',
  appliedAt: new Date('2026-11-01'),
  nextFollowUpAt: null,
  notes: '',
  tailoredResumeId: null,
  coverLetterId: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  m.find.mockResolvedValue(null);
  m.match.mockResolvedValue({
    job: { company: 'Acme', title: 'Engineer', url: 'https://example.com' },
  });
  m.create.mockImplementation(async ({ data }) => ({
    id: 'application',
    ...data,
  }));
  m.update.mockImplementation(async ({ data }) => ({ ...existing, ...data }));
  m.remove.mockResolvedValue({ count: 1 });
});
it('creates a manual application and events together with a fixed owner', async () => {
  const result = await saveApplication('owner', {
    company: 'Acme',
    title: 'Engineer',
    status: 'APPLIED',
  });
  expect(result.created).toBe(true);
  expect(result.application).toMatchObject({
    userId: 'owner',
    jobId: null,
    status: 'APPLIED',
  });
  expect(m.events.mock.calls[0][0].data[0]).toMatchObject({
    applicationId: 'application',
    type: 'STATUS_CHANGE',
    from: null,
    to: 'APPLIED',
  });
  expect(m.lock).toHaveBeenCalled();
});
it('idempotently tracks a matched job without downgrading existing applications', async () => {
  m.find.mockResolvedValue(existing);
  const result = await saveApplication('owner', { jobId: 'job' });
  expect(result.created).toBe(false);
  expect(result.application.status).toBe('INTERVIEW');
  expect(m.find).toHaveBeenCalledWith({
    where: { userId: 'owner', jobId: 'job' },
  });
  expect(m.create).not.toHaveBeenCalled();
  expect(m.events).not.toHaveBeenCalled();
});
it('rejects missing/other-user applications, jobs and linked documents', async () => {
  await expect(
    saveApplication('owner', { status: 'OFFER' }, 'other'),
  ).rejects.toMatchObject({ status: 404 });
  expect(m.find).toHaveBeenCalledWith({
    where: { id: 'other', userId: 'owner' },
  });
  m.match.mockResolvedValue(null);
  await expect(
    saveApplication('owner', { jobId: 'other' }),
  ).rejects.toMatchObject({ status: 404 });
  m.match.mockResolvedValue({
    job: { company: 'Acme', title: 'Engineer', url: '' },
  });
  m.resume.mockResolvedValue(null);
  await expect(
    saveApplication('owner', { jobId: 'job', tailoredResumeId: 'foreign' }),
  ).rejects.toMatchObject({ status: 404 });
  expect(m.resume).toHaveBeenCalledWith({
    where: { id: 'foreign', userId: 'owner', jobId: 'job' },
    select: { id: true },
  });
  expect(m.create).not.toHaveBeenCalled();
});
it('requires manual company/title and disallows relinking an existing application', async () => {
  await expect(saveApplication('owner', {})).rejects.toMatchObject({
    status: 400,
  });
  m.find.mockResolvedValue(existing);
  await expect(
    saveApplication('owner', { jobId: 'different' }, 'application'),
  ).rejects.toMatchObject({ status: 400 });
});
it('scopes deletion to its owner and reports missing applications', async () => {
  await deleteApplication('owner', 'application');
  expect(m.remove).toHaveBeenCalledWith({
    where: { id: 'application', userId: 'owner' },
  });
  m.remove.mockResolvedValue({ count: 0 });
  await expect(deleteApplication('owner', 'foreign')).rejects.toMatchObject({
    status: 404,
  });
});
it('propagates persistence errors instead of reporting a successful transition', async () => {
  m.events.mockRejectedValue(new Error('transaction failed'));
  await expect(
    saveApplication('owner', { company: 'Acme', title: 'Engineer' }),
  ).rejects.toThrow('transaction failed');
});
