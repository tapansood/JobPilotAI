import { describe, expect, it } from 'vitest';
import { extractResume, MAX_UPLOAD_BYTES } from './extract';
import { makeDocx, makePdf } from './fixtures';
describe('resume text extraction', () => {
  it('extracts a generated PDF', async () => {
    const result = await extractResume(await makePdf(), 'resume.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.rawText).toContain('Senior Software Engineer');
    expect(result.rawText).toContain('TypeScript');
  });
  it('extracts generated DOCX content', async () => {
    const result = await extractResume(makeDocx(), 'resume.docx');
    expect(result.mimeType).toContain('wordprocessingml');
    expect(result.rawText).toContain('alex@example.com');
  });
  it('rejects empty, oversized, spoofed and truncated files', async () => {
    for (const [data, name] of [
      [Buffer.alloc(0), 'a.pdf'],
      [Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'a.pdf'],
      [Buffer.from('fake'), 'a.pdf'],
      [Buffer.from('P'), 'a.docx'],
      [Buffer.from('%PDF-broken'), 'a.pdf'],
      [Buffer.from('PK\x03\x04bad'), 'a.docx'],
      [makeDocx(), 'a.pdf'],
    ] as const)
      await expect(extractResume(data, name)).rejects.toThrow();
  });
  it('rejects documents without readable text', async () => {
    await expect(extractResume(await makePdf(''), 'empty.pdf')).rejects.toThrow(
      'No readable text',
    );
    await expect(extractResume(makeDocx(''), 'empty.docx')).rejects.toThrow(
      'No readable text',
    );
  });
});
