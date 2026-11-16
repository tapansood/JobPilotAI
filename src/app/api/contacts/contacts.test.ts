import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ user: vi.fn(), find: vi.fn(), save: vi.fn() }));
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
vi.mock('@/lib/db', () => ({ db: { contact: { findMany: m.find } } }));
vi.mock('@/lib/contacts/service', () => ({ saveContacts: m.save }));
import { GET, POST } from './route';
import { POST as upload } from './import/route';
import { MAX_CSV_BYTES } from '@/lib/contacts';
const request = (body: unknown) =>
  new Request('http://localhost:3000/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const csv =
  'Notes:\nOfficial export\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\nAlex,Morgan,https://www.linkedin.com/in/alex,,Acme Inc.,Engineer,06 Nov 2025';
const csvRequest = (body: string) =>
  new Request('http://localhost:3000/api/contacts/import', {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body,
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: 'owner' });
  m.find.mockResolvedValue([]);
  m.save.mockResolvedValue([{ id: 'contact' }]);
});
afterEach(() => vi.restoreAllMocks());
it('requires authentication for contact reads, manual writes and CSV import', async () => {
  m.user.mockResolvedValue(null);
  expect(
    (await GET(new Request('http://localhost:3000/api/contacts'))).status,
  ).toBe(401);
  expect((await POST(request({}))).status).toBe(401);
  expect((await upload(csvRequest(csv))).status).toBe(401);
  expect(m.find).not.toHaveBeenCalled();
  expect(m.save).not.toHaveBeenCalled();
});
it('lists and searches only the current users contacts with normalized company filtering', async () => {
  m.find.mockResolvedValue([
    {
      id: 'contact',
      firstName: 'Alex',
      lastName: 'Morgan',
      company: 'ACME Inc.',
      email: null,
    },
    { id: 'other', firstName: 'Alex', company: 'Other Corp' },
  ]);
  expect(
    await (
      await GET(
        new Request(
          'http://localhost:3000/api/contacts?q=alex&company=Acme%20LLC',
        ),
      )
    ).json(),
  ).toEqual({
    contacts: [
      {
        id: 'contact',
        firstName: 'Alex',
        lastName: 'Morgan',
        company: 'ACME Inc.',
        email: null,
      },
    ],
  });
  expect(m.find.mock.calls[0][0].where).toEqual({ userId: 'owner' });
  m.find.mockResolvedValue([]);
  expect(
    await (await GET(new Request('http://localhost:3000/api/contacts'))).json(),
  ).toEqual({ contacts: [] });
});
it('adds a validated manual contact and imports official CSV with a fixed owner and source', async () => {
  expect(
    (
      await POST(
        request({
          firstName: 'Alex',
          lastName: 'Morgan',
          company: 'Acme',
          position: 'Engineer',
          userId: 'other',
        }),
      )
    ).status,
  ).toBe(201);
  expect(m.save.mock.calls[0][0]).toBe('owner');
  expect(m.save.mock.calls[0][2]).toBe('MANUAL');
  expect((await upload(csvRequest(csv))).status).toBe(201);
  expect(m.save.mock.calls[1][0]).toBe('owner');
  expect(m.save.mock.calls[1][2]).toBe('LINKEDIN_EXPORT');
  expect(m.save.mock.calls[1][1][0]).toMatchObject({
    company: 'Acme Inc.',
    email: null,
  });
});
it('rejects invalid contacts, unsafe links, oversized streams and malformed imports before persistence', async () => {
  expect((await POST(request({ firstName: '' }))).status).toBe(400);
  expect(
    (
      await POST(
        request({
          firstName: 'Alex',
          lastName: '',
          company: '',
          position: '',
          linkedinUrl: 'javascript:alert(1)',
        }),
      )
    ).status,
  ).toBe(400);
  for (const body of ['', 'not a CSV', 'x'.repeat(MAX_CSV_BYTES + 1)])
    expect((await upload(csvRequest(body))).status).toBe(400);
  expect(m.save).not.toHaveBeenCalled();
});
it('reports storage errors without claiming an import succeeded', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.save.mockRejectedValue(new Error('unavailable'));
  expect((await upload(csvRequest(csv))).status).toBe(500);
});
