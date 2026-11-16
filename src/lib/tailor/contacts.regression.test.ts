import { expect, it, vi, afterEach } from 'vitest';
import { parseProfile } from '@/lib/profile/parse';
import { sampleResume } from '@/lib/profile/fixtures';
import { deterministicTailor } from './content';
import { exportDocx, exportPdf } from './export';
import { extractResume } from '@/lib/profile/extract';
import { profile, job } from './fixtures';
import { profileSchema } from '@/lib/profile/schema';
afterEach(() => vi.unstubAllEnvs());
it('leaves missing contacts blank and rejects unsafe edited contact links', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  expect(await parseProfile('Software Engineer')).toMatchObject({
    email: '',
    phone: '',
    linkedinUrl: '',
    website: '',
    location: '',
  });
  expect(
    profileSchema.safeParse({ ...profile, website: 'javascript:alert(1)' })
      .success,
  ).toBe(false);
});
it('extracts explicit resume contact fields rather than account identifiers', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  const result = await parseProfile(
    `${sampleResume}\nhttps://www.linkedin.com/in/alex-morgan\nhttps://alex.example.com`,
  );
  expect(result).toMatchObject({
    email: 'alex@example.com',
    phone: '+14155552671',
    linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
    website: 'https://alex.example.com',
    location: 'Seattle, WA',
  });
});
it('includes a factual contact header in PDF and DOCX exports', async () => {
  const content = deterministicTailor(
    {
      ...profile,
      email: 'alex@example.com',
      phone: '+14155552671',
      linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
      website: 'https://alex.example.com',
      location: 'Seattle, WA',
    },
    job,
  );
  for (const [buffer, name] of [
    [await exportPdf(content), 'resume.pdf'],
    [await exportDocx(content), 'resume.docx'],
  ] as const) {
    const { rawText } = await extractResume(buffer, name);
    for (const value of [
      'alex@example.com',
      '+14155552671',
      'https://www.linkedin.com/in/alex-morgan',
      'https://alex.example.com',
      'Seattle, WA',
    ])
      expect(rawText).toContain(value);
  }
});
