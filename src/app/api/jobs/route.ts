import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/service';
import { authFailure } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { fingerprint } from '@/lib/jobs/dedupe';
import { canonicalStatuses } from '@/lib/jobs/status';
const filters = z.object({
  minScore: z.coerce.number().min(0).max(100).default(0),
  remote: z.enum(['true', 'false']).optional(),
  source: z.string().max(80).optional(),
  saved: z.enum(['true', 'false']).optional(),
});
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to view matches.' },
        { status: 401 },
      );
    const parsed = filters.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid filters.' }, { status: 400 });
    const { minScore, remote, source, saved } = parsed.data;
    const matches = await db.jobMatch.findMany({
      where: {
        userId: user.id,
      },
      include: { job: true },
      orderBy: [{ score: 'desc' }, { id: 'asc' }],
    });
    const seen = new Set<string>();
    return NextResponse.json({
      matches: canonicalStatuses(matches).filter((match) => {
        if (
          match.status === 'HIDDEN' ||
          match.score < minScore ||
          (saved === 'true' && match.status !== 'SAVED') ||
          (saved === 'false' && match.status !== null) ||
          (remote && match.job.remote !== (remote === 'true')) ||
          (source && match.job.source !== source)
        )
          return false;
        const key = fingerprint(match.job);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    });
  } catch (error) {
    return authFailure(error);
  }
}
