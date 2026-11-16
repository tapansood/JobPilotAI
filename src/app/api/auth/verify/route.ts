import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginInput } from '@/lib/auth/tokens';
import { verifyLogin } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    const parsed = loginInput.safeParse(body);
    const token = z.string().min(6).max(128).safeParse(body?.token);
    if (!parsed.success || !token.success)
      return NextResponse.json(
        { error: 'Invalid sign-in details.' },
        { status: 400 },
      );
    await verifyLogin(parsed.data.type, parsed.data.identifier, token.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authFailure(error);
  }
}
