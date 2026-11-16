import { NextResponse } from 'next/server';
import { authFailure } from '@/lib/auth/http';
import { ApplicationError } from './service';
export function applicationFailure(error: unknown) {
  if (error instanceof ApplicationError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  return authFailure(error);
}
