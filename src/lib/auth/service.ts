import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { deliverEmail, deliverSms } from './delivery';
import {
  hashToken,
  randomOtp,
  randomToken,
  SESSION_COOKIE,
  tokenMatches,
} from './tokens';
type Method = 'EMAIL' | 'SMS';
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function serializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < 3
      )
        continue;
      throw error;
    }
  }
}
export async function requestLogin(type: Method, identifier: string) {
  const token = type === 'SMS' ? randomOtp() : randomToken();
  const now = new Date();
  const record = await serializable(async (tx) => {
    const recent = await tx.verificationToken.count({
      where: {
        identifier,
        createdAt: { gt: new Date(now.getTime() - 3600000) },
      },
    });
    const latest = await tx.verificationToken.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
    });
    if (
      recent >= 5 ||
      (latest && now.getTime() - latest.createdAt.getTime() < 60000)
    )
      throw new AuthError(
        'Please wait before requesting another sign-in message.',
        429,
      );
    await tx.verificationToken.updateMany({
      where: { identifier, type },
      data: { expiresAt: now },
    });
    return tx.verificationToken.create({
      data: {
        identifier,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + (type === 'SMS' ? 10 : 15) * 60000),
      },
    });
  });
  try {
    if (type === 'EMAIL') await deliverEmail(identifier, token);
    else await deliverSms(identifier, token);
  } catch {
    await db.verificationToken.update({
      where: { id: record.id },
      data: { expiresAt: new Date() },
    });
    throw new AuthError(
      'Unable to deliver your sign-in message. Please try again later.',
      503,
    );
  }
}
export async function verifyLogin(
  type: Method,
  identifier: string,
  token: string,
) {
  const sessionToken = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const valid = await serializable(async (tx) => {
    const record = await tx.verificationToken.findFirst({
      where: { identifier, type },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt <= new Date() || record.attempts >= 5)
      return false;
    await tx.verificationToken.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    if (!tokenMatches(token, record.tokenHash)) return false;
    await tx.verificationToken.update({
      where: { id: record.id },
      data: { expiresAt: new Date(0) },
    });
    const user =
      type === 'EMAIL'
        ? await tx.user.upsert({
            where: { email: identifier },
            create: { email: identifier },
            update: {},
          })
        : await tx.user.upsert({
            where: { phone: identifier },
            create: { phone: identifier },
            update: {},
          });
    await tx.session.create({
      data: { userId: user.id, tokenHash: hashToken(sessionToken), expiresAt },
    });
    return true;
  });
  if (!valid)
    throw new AuthError(
      'Invalid or expired sign-in details. Request a new link or code.',
    );
  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}
