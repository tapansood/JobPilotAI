import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { parseConnections, MAX_CSV_BYTES } from '@/lib/contacts';
import { saveContacts } from '@/lib/contacts/service';
import { limitedText } from '@/lib/http/body';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to import connections.' },
        { status: 401 },
      );
    let contacts;
    try {
      contacts = parseConnections(await limitedText(request, MAX_CSV_BYTES));
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    const result = await saveContacts(user.id, contacts, 'LINKEDIN_EXPORT');
    return NextResponse.json({ imported: result.length }, { status: 201 });
  } catch (error) {
    return authFailure(error);
  }
}
