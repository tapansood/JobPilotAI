import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { extractResume } from '@/lib/profile/extract';
import { deterministicTailor } from './content';
import { exportDocx, exportPdf } from './export';
import { profile, emptyProfile, job } from './fixtures';
it('exports a valid readable DOCX and PDF containing the factual resume', async () => {
  const content = deterministicTailor(profile, job);
  const docx = await exportDocx(content),
    pdf = await exportPdf(content);
  expect(docx.subarray(0, 2).toString()).toBe('PK');
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  for (const [data, name] of [
    [docx, 'resume.docx'],
    [pdf, 'resume.pdf'],
  ] as const) {
    const { rawText } = await extractResume(data, name);
    for (const text of [
      'Software Engineer',
      'Docker',
      'Acme',
      'Example University',
      '2020',
    ])
      expect(rawText).toContain(text);
  }
});
it('exports valid empty-profile documents', async () => {
  const content = deterministicTailor(emptyProfile, job);
  expect((await exportDocx(content)).subarray(0, 2).toString()).toBe('PK');
  expect(
    (await PDFDocument.load(await exportPdf(content))).getPageCount(),
  ).toBe(1);
});
it('paginates long text and safely converts unsupported font characters', async () => {
  const content = deterministicTailor(
    { ...profile, summary: 'Résumé — Docker 🛠.\n'.repeat(150) },
    job,
  );
  expect(
    (await PDFDocument.load(await exportPdf(content))).getPageCount(),
  ).toBeGreaterThan(1);
});
