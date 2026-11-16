import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  tx: {
    verificationToken: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { upsert: vi.fn() },
    session: { create: vi.fn() },
  },
  session: { findUnique: vi.fn(), deleteMany: vi.fn() },
  cookie: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  email: vi.fn(),
  sms: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: (work: (tx: unknown) => unknown) => work(mocks.tx),
    verificationToken: mocks.tx.verificationToken,
    session: mocks.session,
  },
}));
vi.mock('next/headers', () => ({ cookies: async () => mocks.cookie }));
vi.mock('./delivery', () => ({
  deliverEmail: mocks.email,
  deliverSms: mocks.sms,
}));
import { currentUser, logout, requestLogin, verifyLogin } from './service';
import { hashToken } from './tokens';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.tx.verificationToken.count.mockResolvedValue(0);
  mocks.tx.verificationToken.create.mockResolvedValue({ id: 'v1' });
  mocks.tx.user.upsert.mockResolvedValue({ id: 'u1' });
});
describe('authentication service', () => {
  it.each(['EMAIL', 'SMS'] as const)(
    'sends %s challenges hashed',
    async (type) => {
      await requestLogin(type, 'person');
      expect(mocks.tx.verificationToken.create).toHaveBeenCalled();
      const args = mocks.tx.verificationToken.create.mock.calls[0][0];
      const delivery = type === 'EMAIL' ? mocks.email : mocks.sms;
      expect(args.data.tokenHash).toBe(hashToken(delivery.mock.calls[0][1]));
    },
  );
  it('limits requests and invalidates failed deliveries', async () => {
    mocks.tx.verificationToken.count.mockResolvedValue(5);
    await expect(requestLogin('EMAIL', 'a')).rejects.toMatchObject({
      status: 429,
    });
    mocks.tx.verificationToken.count.mockResolvedValue(0);
    mocks.email.mockRejectedValue(new Error());
    await expect(requestLogin('EMAIL', 'a')).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.tx.verificationToken.update).toHaveBeenCalled();
  });
  it('creates a session only after valid verification', async () => {
    mocks.tx.verificationToken.findFirst.mockResolvedValue({
      id: 'v1',
      expiresAt: new Date(Date.now() + 100000),
      attempts: 0,
      tokenHash: hashToken('123456'),
    });
    await verifyLogin('SMS', '+14155552671', '123456');
    expect(mocks.tx.session.create).toHaveBeenCalled();
    expect(mocks.cookie.set).toHaveBeenCalledWith(
      'jobpilot_session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });
  it.each(['missing', 'expired', 'exhausted', 'wrong'])(
    'rejects %s challenge without a session',
    async (condition) => {
      mocks.tx.verificationToken.findFirst.mockResolvedValue(
        condition === 'missing'
          ? null
          : {
              id: 'v1',
              expiresAt: new Date(
                Date.now() + (condition === 'expired' ? -10000 : 100000),
              ),
              attempts: condition === 'exhausted' ? 5 : 0,
              tokenHash: hashToken('correct'),
            },
      );
      await expect(verifyLogin('EMAIL', 'a', 'wrong')).rejects.toThrow(
        'Invalid or expired',
      );
      expect(mocks.tx.session.create).not.toHaveBeenCalled();
      if (condition === 'wrong')
        expect(mocks.tx.verificationToken.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { attempts: { increment: 1 } } }),
        );
    },
  );
  it('handles missing/expired sessions and logout', async () => {
    expect(await currentUser()).toBeNull();
    mocks.cookie.get.mockReturnValue({ value: 'token' });
    mocks.session.findUnique.mockResolvedValue({
      expiresAt: new Date(0),
      user: { id: 'u1' },
    });
    expect(await currentUser()).toBeNull();
    mocks.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'u1' },
    });
    expect(await currentUser()).toEqual({ id: 'u1' });
    await logout();
    expect(mocks.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('token') },
    });
    expect(mocks.cookie.delete).toHaveBeenCalled();
  });
});
