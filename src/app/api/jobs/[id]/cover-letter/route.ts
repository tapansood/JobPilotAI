import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { jobContext } from '@/lib/tailor/context';
import { generateCoverLetter } from '@/lib/tailor';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const context = await jobContext(user.id, id);
    if (!context)
      return NextResponse.json(
        { error: 'Job match or profile not found.' },
        { status: 404 },
      );
    const body = await generateCoverLetter(context.profile, context.job);
    const coverLetter = await db.coverLetter.create({
      data: { userId: user.id, jobId: id, body },
    });
    return NextResponse.json({ coverLetter }, { status: 201 });
  } catch (error) {
    return authFailure(error);
  }
}
