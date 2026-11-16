import { NextResponse } from 'next/server';
import { loginInput } from '@/lib/auth/tokens';
import { requestLogin } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const parsed = loginInput.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Enter a valid email or phone in international format.' },
        { status: 400 },
      );
    await requestLogin(parsed.data.type, parsed.data.identifier);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authFailure(error);
  }
}
