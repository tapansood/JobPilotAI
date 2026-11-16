import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure, checkOrigin } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { jobContext } from '@/lib/tailor/context';
import { companyContacts } from '@/lib/contacts/service';
import { outreachDrafts } from '@/lib/outreach';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const context = await jobContext(user.id, id);
    if (!context)
      return NextResponse.json(
        { error: 'Job match or profile not found.' },
        { status: 404 },
      );
    const contacts = await companyContacts(user.id, context.job.company);
    const content = [
      ...outreachDrafts(context.profile, context.job),
      ...contacts.flatMap((contact) =>
        outreachDrafts(context.profile, context.job, contact),
      ),
    ];
    const drafts = await db.$transaction(
      content.map((draft) =>
        db.outreachDraft.create({
          data: { userId: user.id, jobId: id, ...draft },
        }),
      ),
    );
    return NextResponse.json({ contacts, drafts }, { status: 201 });
  } catch (error) {
    return authFailure(error);
  }
}
