import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
export const loginInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('EMAIL'),
    identifier: z.string().trim().toLowerCase().email().max(254),
  }),
  z.object({
    type: z.literal('SMS'),
    identifier: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        'Use international format, e.g. +14155552671',
      ),
  }),
]);
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export const randomOtp = () =>
  randomInt(0, 1_000_000).toString().padStart(6, '0');
export function tokenMatches(token: string, hash: string) {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const SESSION_COOKIE = 'jobpilot_session';
