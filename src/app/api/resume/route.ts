import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/service';
import { checkOrigin, authFailure } from '@/lib/auth/http';
import { extractResume, MAX_UPLOAD_BYTES } from '@/lib/profile/extract';
import { parseProfile } from '@/lib/profile/parse';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let key: string | undefined;
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to upload a resume.' },
        { status: 401 },
      );
    const limit = MAX_UPLOAD_BYTES + 65536;
    if (Number(request.headers.get('content-length')) > limit)
      return NextResponse.json(
        { error: 'Resume must be 5 MB or smaller.' },
        { status: 413 },
      );
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data'))
      return NextResponse.json(
        { error: 'Use a multipart file upload.' },
        { status: 400 },
      );
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { error: 'Upload a resume file.' },
        { status: 400 },
      );
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) {
          await reader.cancel();
          return NextResponse.json(
            { error: 'Resume must be 5 MB or smaller.' },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), {
        headers: { 'Content-Type': request.headers.get('content-type')! },
      }).formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid multipart upload.' },
        { status: 400 },
      );
    }
    const file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json(
        { error: 'Select a PDF or DOCX resume.' },
        { status: 400 },
      );
    if (file.size > MAX_UPLOAD_BYTES)
      return NextResponse.json(
        { error: 'Resume must be 5 MB or smaller.' },
        { status: 413 },
      );
    const data = Buffer.from(await file.arrayBuffer());
    let extracted;
    try {
      extracted = await extractResume(data, file.name);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Unable to extract resume text.',
        },
        { status: 422 },
      );
    }
    let profile;
    try {
      profile = await parseProfile(extracted.rawText);
    } catch {
      return NextResponse.json(
        {
          error:
            'Unable to parse a valid profile. Please try again or check your AI configuration.',
        },
        { status: 422 },
      );
    }
    key = await storage.put(data);
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      await tx.resume.updateMany({
        where: { userId: user.id, isPrimary: true },
        data: { isPrimary: false },
      });
      const resume = await tx.resume.create({
        data: {
          userId: user.id,
          fileName: file.name.replace(/[/\\]/g, '_').slice(0, 255),
          mimeType: extracted.mimeType,
          rawText: extracted.rawText,
          storageKey: key!,
          isPrimary: true,
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          createdAt: true,
          isPrimary: true,
        },
      });
      const saved = await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profile },
        update: profile,
      });
      return { resume, profile: saved };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (key)
      await storage
        .remove(key)
        .catch(() => console.error('Failed to clean up resume upload'));
    return authFailure(error);
  }
}
