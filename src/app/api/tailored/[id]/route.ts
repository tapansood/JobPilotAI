import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { validateTailored, tailoredSchema } from '@/lib/tailor/content';
import { jobContext } from '@/lib/tailor/context';
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const existing = await db.tailoredResume.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing)
      return NextResponse.json(
        { error: 'Tailored resume not found.' },
        { status: 404 },
      );
    const context = await jobContext(user.id, existing.jobId);
    if (!context)
      return NextResponse.json(
        { error: 'Profile not found.' },
        { status: 404 },
      );
    const parsed = tailoredSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid tailored resume.' },
        { status: 400 },
      );
    const content = validateTailored(parsed.data, context.profile, context.job);
    const requested = parsed.data;
    if (
      content.headline !== requested.headline ||
      content.summary !== requested.summary ||
      JSON.stringify(content.experience) !==
        JSON.stringify(requested.experience) ||
      JSON.stringify(content.education) !==
        JSON.stringify(requested.education) ||
      JSON.stringify(content.skills) !== JSON.stringify(requested.skills)
    )
      return NextResponse.json(
        {
          error:
            'Edits must use profile facts and approved wording: original headline/summary/bullets or generated variants. Remove or reorder existing bullets/skills; do not add qualifications.',
        },
        { status: 422 },
      );
    const tailored = await db.tailoredResume.update({
      where: { id },
      data: { content },
    });
    return NextResponse.json({ tailored });
  } catch (error) {
    return authFailure(error);
  }
}
