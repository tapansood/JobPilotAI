import { z } from 'zod';
export const statuses = [
  'SAVED',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type Status = (typeof statuses)[number];
const date = z.iso.datetime({ offset: true }).nullable();
export const applicationInput = z
  .object({
    jobId: z.string().min(1).max(200).nullable().optional(),
    company: z.string().trim().min(1).max(500).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    url: z
      .union([
        z
          .url()
          .refine(
            (value) => /^https?:\/\//i.test(value),
            'Use an HTTP(S) URL.',
          ),
        z.literal(''),
      ])
      .optional(),
    status: z.enum(statuses).optional(),
    appliedAt: date.optional(),
    nextFollowUpAt: date.optional(),
    notes: z.string().max(20000).optional(),
    tailoredResumeId: z.string().min(1).max(200).nullable().optional(),
    coverLetterId: z.string().min(1).max(200).nullable().optional(),
  })
  .strict();
export type ApplicationInput = z.infer<typeof applicationInput>;
type State = {
  status: Status;
  appliedAt: Date | null;
  nextFollowUpAt: Date | null;
  notes: string;
};
export function transition(
  previous: State | null,
  input: ApplicationInput,
  now = new Date(),
) {
  const status = input.status ?? previous?.status ?? 'SAVED';
  let appliedAt =
    input.appliedAt === undefined
      ? (previous?.appliedAt ?? null)
      : input.appliedAt
        ? new Date(input.appliedAt)
        : null;
  let nextFollowUpAt =
    input.nextFollowUpAt === undefined
      ? (previous?.nextFollowUpAt ?? null)
      : input.nextFollowUpAt
        ? new Date(input.nextFollowUpAt)
        : null;
  if (status === 'APPLIED' && previous?.status !== 'APPLIED') {
    appliedAt ??= now;
    if (input.nextFollowUpAt === undefined && !nextFollowUpAt)
      nextFollowUpAt = new Date(now.getTime() + 7 * 86400000);
  }
  const notes = input.notes ?? previous?.notes ?? '';
  const events: {
    type: 'STATUS_CHANGE' | 'NOTE' | 'FOLLOW_UP';
    from?: string | null;
    to?: string | null;
    note?: string;
  }[] = [];
  if (status !== previous?.status)
    events.push({
      type: 'STATUS_CHANGE',
      from: previous?.status ?? null,
      to: status,
    });
  if (notes !== (previous?.notes ?? ''))
    events.push({ type: 'NOTE', note: notes || 'Notes cleared.' });
  if (nextFollowUpAt?.toISOString() !== previous?.nextFollowUpAt?.toISOString())
    events.push({
      type: 'FOLLOW_UP',
      from: previous?.nextFollowUpAt?.toISOString() ?? null,
      to: nextFollowUpAt?.toISOString() ?? null,
    });
  return { status, appliedAt, nextFollowUpAt, notes, events };
}
export function daysSinceApplied(
  value: string | Date | null,
  now = new Date(),
) {
  return value
    ? Math.max(
        0,
        Math.floor((now.getTime() - new Date(value).getTime()) / 86400000),
      )
    : null;
}
export function followUpState(
  value: string | Date | null,
  status: Status,
  now = new Date(),
) {
  if (!value || status === 'REJECTED' || status === 'WITHDRAWN') return null;
  const day = new Date(value).toISOString().slice(0, 10),
    today = now.toISOString().slice(0, 10);
  return day < today ? 'overdue' : day === today ? 'today' : 'scheduled';
}
