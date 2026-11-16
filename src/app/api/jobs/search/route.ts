import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { searchForUser } from '@/lib/jobs/service';
export const runtime = 'nodejs';
const schema = z.object({
  query: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  remote: z.boolean().optional(),
  page: z.number().int().min(1).max(20).optional(),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to search jobs.' },
        { status: 401 },
      );
    const input = schema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json(
        { error: 'Invalid search filters.' },
        { status: 400 },
      );
    const result = await searchForUser(user.id, input.data);
    if (!result)
      return NextResponse.json(
        { error: 'Upload a resume to create your profile first.' },
        { status: 409 },
      );
    return NextResponse.json(result);
  } catch (error) {
    return authFailure(error);
  }
}
