import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { contactSchema, contactData, normalizeCompany } from '@/lib/contacts';
import { saveContacts } from '@/lib/contacts/service';
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to view contacts.' },
        { status: 401 },
      );
    const params = new URL(request.url).searchParams;
    const query = (params.get('q') || '').toLowerCase();
    const company = params.get('company');
    const contacts = await db.contact.findMany({
      where: { userId: user.id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return NextResponse.json({
      contacts: contacts.filter(
        (contact) =>
          (!query ||
            `${contact.firstName} ${contact.lastName} ${contact.company} ${contact.email || ''}`
              .toLowerCase()
              .includes(query)) &&
          (!company ||
            normalizeCompany(contact.company) === normalizeCompany(company)),
      ),
    });
  } catch (error) {
    return authFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to add contacts.' },
        { status: 401 },
      );
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Check the contact fields and email address.' },
        { status: 400 },
      );
    let contact;
    try {
      contact = contactData(parsed.data);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    const [saved] = await saveContacts(user.id, [contact], 'MANUAL');
    return NextResponse.json({ contact: saved }, { status: 201 });
  } catch (error) {
    return authFailure(error);
  }
}
