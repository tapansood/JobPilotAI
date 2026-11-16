import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure } from '@/lib/auth/http';
import { db } from '@/lib/db';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const letter = await db.coverLetter.findFirst({
      where: { id, userId: user.id },
    });
    if (!letter)
      return NextResponse.json(
        { error: 'Cover letter not found.' },
        { status: 404 },
      );
    return new Response(letter.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="JobPilotAI-cover-letter.txt"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return authFailure(error);
  }
}
