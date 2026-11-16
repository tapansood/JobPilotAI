import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  upsert: vi.fn(),
  find: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: { contact: { findMany: m.find }, $transaction: m.transaction },
}));
import { saveContacts, companyContacts } from './service';
import { contactData, contactSchema } from './index';
beforeEach(() => {
  vi.resetAllMocks();
  m.transaction.mockImplementation(async (fn) =>
    fn({ contact: { upsert: m.upsert } }),
  );
});
it('upserts on the user-scoped identity and preserves requested source', async () => {
  const contact = contactData(
    contactSchema.parse({
      firstName: 'Alex',
      lastName: 'Morgan',
      company: 'Acme',
      position: 'Engineer',
    }),
  );
  m.upsert.mockResolvedValue({ id: 'contact', ...contact });
  expect(
    await saveContacts('owner', [contact], 'LINKEDIN_EXPORT'),
  ).toHaveLength(1);
  expect(m.upsert).toHaveBeenCalledWith({
    where: {
      userId_identityKey: { userId: 'owner', identityKey: contact.identityKey },
    },
    create: { userId: 'owner', ...contact, source: 'LINKEDIN_EXPORT' },
    update: { ...contact, source: 'LINKEDIN_EXPORT' },
  });
});
it('matches normalized employers only within the current user and ignores unknown companies', async () => {
  m.find.mockResolvedValue([
    { id: 'match', company: 'ACME, Inc.' },
    { id: 'other', company: 'Acme Services' },
  ]);
  expect(await companyContacts('owner', 'Acme LLC')).toEqual([
    { id: 'match', company: 'ACME, Inc.' },
  ]);
  expect(m.find.mock.calls[0][0].where).toEqual({ userId: 'owner' });
  m.find.mockClear();
  expect(await companyContacts('owner', '')).toEqual([]);
  expect(m.find).not.toHaveBeenCalled();
});
it('handles an empty import and propagates persistence failures', async () => {
  expect(await saveContacts('owner', [], 'MANUAL')).toEqual([]);
  m.transaction.mockRejectedValue(new Error('database unavailable'));
  await expect(saveContacts('owner', [], 'MANUAL')).rejects.toThrow(
    'database unavailable',
  );
});
