import { NextResponse } from 'next/server';
import { AuthError } from './service';
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new URL(process.env.APP_URL || 'http://localhost:3000')
    .origin;
  if (origin && origin !== allowed)
    throw new AuthError('Invalid request origin.', 403);
}
export function authFailure(error: unknown) {
  if (error instanceof AuthError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: 'Invalid JSON request.' },
      { status: 400 },
    );
  console.error('Authentication request failed');
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}
