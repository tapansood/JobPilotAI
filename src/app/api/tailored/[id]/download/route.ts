import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { authFailure } from '@/lib/auth/http';
import { db } from '@/lib/db';
import { tailoredSchema } from '@/lib/tailor/content';
import { exportDocx, exportPdf } from '@/lib/tailor/export';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const format = new URL(request.url).searchParams.get('format');
    if (format !== 'pdf' && format !== 'docx')
      return NextResponse.json(
        { error: 'Use format=pdf or format=docx.' },
        { status: 400 },
      );
    const { id } = await params;
    const tailored = await db.tailoredResume.findFirst({
      where: { id, userId: user.id },
    });
    if (!tailored)
      return NextResponse.json(
        { error: 'Tailored resume not found.' },
        { status: 404 },
      );
    const content = tailoredSchema.parse(tailored.content);
    const data =
      format === 'pdf' ? await exportPdf(content) : await exportDocx(content);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type':
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="JobPilotAI-resume.${format}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return authFailure(error);
  }
}
