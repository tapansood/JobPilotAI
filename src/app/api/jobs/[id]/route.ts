import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { fingerprint } from '@/lib/jobs/dedupe';
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to update matches.' },
        { status: 401 },
      );
    const body = z
      .object({ status: z.enum(['SAVED', 'HIDDEN']).nullable() })
      .safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { error: 'Use SAVED, HIDDEN, or null status.' },
        { status: 400 },
      );
    const { id } = await params;
    const matches = await db.jobMatch.findMany({
      where: { userId: user.id },
      include: { job: true },
    });
    const selected = matches.find((match) => match.jobId === id);
    if (!selected)
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    const key = fingerprint(selected.job);
    const ids = matches
      .filter((match) => fingerprint(match.job) === key)
      .map((match) => match.jobId);
    const result = await db.jobMatch.updateMany({
      where: { jobId: { in: ids }, userId: user.id },
      data: { status: body.data.status },
    });
    if (!result.count)
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authFailure(error);
  }
}
