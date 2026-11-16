import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await logout();
    return NextResponse.redirect(
      new URL('/login', process.env.APP_URL || 'http://localhost:3000'),
      303,
    );
  } catch (error) {
    return authFailure(error);
  }
}
