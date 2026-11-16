import { db } from '@/lib/db';
import { profileSchema } from '@/lib/profile/schema';
export async function jobContext(userId: string, jobId: string) {
  const match = await db.jobMatch.findUnique({
    where: { userId_jobId: { userId, jobId } },
    include: { job: true },
  });
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!match || !profile) return null;
  return { job: match.job, profile: profileSchema.parse(profile) };
}
