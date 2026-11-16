import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { companyContacts } from '@/lib/contacts/service';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const match = await db.jobMatch.findUnique({
      where: { userId_jobId: { userId: user.id, jobId: id } },
      include: { job: true },
    });
    if (!match)
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    const [tailored, coverLetter, drafts, contacts] = await Promise.all([
      db.tailoredResume.findFirst({
        where: { userId: user.id, jobId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.coverLetter.findFirst({
        where: { userId: user.id, jobId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.outreachDraft.findMany({
        where: { userId: user.id, jobId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      companyContacts(user.id, match.job.company),
    ]);
    return NextResponse.json({ tailored, coverLetter, drafts, contacts });
  } catch (error) {
    return authFailure(error);
  }
}
