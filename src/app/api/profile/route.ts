import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { profileSchema } from '@/lib/profile/schema';
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to view your profile.' },
        { status: 401 },
      );
    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    const resume = await db.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
      select: { id: true, fileName: true, createdAt: true },
    });
    return NextResponse.json({ profile, resume });
  } catch (error) {
    return authFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to edit your profile.' },
        { status: 401 },
      );
    const input = profileSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json(
        {
          error:
            'Invalid profile. Check field lengths and enter years between 0 and 80.',
        },
        { status: 400 },
      );
    const profile = await db.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input.data },
      update: input.data,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return authFailure(error);
  }
}
