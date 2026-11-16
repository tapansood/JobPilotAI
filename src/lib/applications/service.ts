import { db } from '@/lib/db';
import { transition, type ApplicationInput } from './logic';
export class ApplicationError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function saveApplication(
  userId: string,
  input: ApplicationInput,
  id?: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${userId}))`;
    const existing = id
      ? await tx.application.findFirst({ where: { id, userId } })
      : input.jobId
        ? await tx.application.findFirst({
            where: { userId, jobId: input.jobId },
          })
        : null;
    if (id && !existing)
      throw new ApplicationError('Application not found.', 404);
    if (existing && input.jobId !== undefined && input.jobId !== existing.jobId)
      throw new ApplicationError('A tracked job cannot be relinked.', 400);
    const jobId = existing?.jobId ?? input.jobId ?? null;
    const match = jobId
      ? await tx.jobMatch.findUnique({
          where: { userId_jobId: { userId, jobId } },
          include: { job: true },
        })
      : null;
    if (jobId && !match)
      throw new ApplicationError('Job match not found.', 404);
    for (const key of ['tailoredResumeId', 'coverLetterId'] as const) {
      const documentId =
        input[key] === undefined ? existing?.[key] : input[key];
      if (documentId) {
        const query = {
          where: { id: documentId, userId, ...(jobId ? { jobId } : {}) },
          select: { id: true as const },
        };
        const document =
          key === 'tailoredResumeId'
            ? await tx.tailoredResume.findFirst(query)
            : await tx.coverLetter.findFirst(query);
        if (!document)
          throw new ApplicationError(
            'Linked document not found for this application.',
            404,
          );
      }
    }
    const company = input.company ?? existing?.company ?? match?.job.company;
    const title = input.title ?? existing?.title ?? match?.job.title;
    if (!company || !title)
      throw new ApplicationError(
        'Company and title are required for manual applications.',
        400,
      );
    const { events, ...state } = transition(existing, input);
    const data = {
      ...state,
      company,
      title,
      url: input.url ?? existing?.url ?? match?.job.url ?? '',
      tailoredResumeId:
        input.tailoredResumeId === undefined
          ? (existing?.tailoredResumeId ?? null)
          : input.tailoredResumeId,
      coverLetterId:
        input.coverLetterId === undefined
          ? (existing?.coverLetterId ?? null)
          : input.coverLetterId,
    };
    const application = existing
      ? await tx.application.update({ where: { id: existing.id }, data })
      : await tx.application.create({ data: { userId, jobId, ...data } });
    if (events.length)
      await tx.applicationEvent.createMany({
        data: events.map((event) => ({
          ...event,
          applicationId: application.id,
        })),
      });
    return { application, created: !existing };
  });
}
export async function deleteApplication(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${userId}))`;
    const result = await tx.application.deleteMany({ where: { id, userId } });
    if (!result.count)
      throw new ApplicationError('Application not found.', 404);
  });
}
