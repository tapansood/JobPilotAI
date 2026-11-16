import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { applicationInput } from '@/lib/applications/logic';
import { saveApplication, deleteApplication } from '@/lib/applications/service';
import { applicationFailure } from '@/lib/applications/http';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const application = await db.application.findFirst({
      where: { id, userId: user.id },
      include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    });
    if (!application)
      return NextResponse.json(
        { error: 'Application not found.' },
        { status: 404 },
      );
    const where = {
      userId: user.id,
      ...(application.jobId ? { jobId: application.jobId } : {}),
    };
    const select = {
      id: true,
      createdAt: true,
      job: { select: { title: true, company: true } },
    };
    const [tailoredResumes, coverLetters] = await Promise.all([
      db.tailoredResume.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.coverLetter.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return NextResponse.json({ application, tailoredResumes, coverLetters });
  } catch (error) {
    return applicationFailure(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const parsed = applicationInput.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid application fields, dates or URL.' },
        { status: 400 },
      );
    const { id } = await params;
    const { application } = await saveApplication(user.id, parsed.data, id);
    return NextResponse.json({ application });
  } catch (error) {
    return applicationFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    await deleteApplication(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return applicationFailure(error);
  }
}
