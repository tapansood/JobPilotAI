import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { applicationInput } from '@/lib/applications/logic';
import { saveApplication } from '@/lib/applications/service';
import { applicationFailure } from '@/lib/applications/http';
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const jobId = new URL(request.url).searchParams.get('jobId');
    const applications = await db.application.findMany({
      where: { userId: user.id, ...(jobId ? { jobId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ applications });
  } catch (error) {
    return applicationFailure(error);
  }
}
export async function POST(request: Request) {
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
    const result = await saveApplication(user.id, parsed.data);
    return NextResponse.json(
      { application: result.application },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return applicationFailure(error);
  }
}
