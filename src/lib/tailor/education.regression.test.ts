import { afterEach, expect, it, vi } from 'vitest';
import { heuristicProfile } from '@/lib/profile/heuristic';
import { parseProfile } from '@/lib/profile/parse';
import { sampleResume } from '@/lib/profile/fixtures';
import { extractResume } from '@/lib/profile/extract';
import { profileSchema } from '@/lib/profile/schema';
import { mockProvider } from '@/lib/ai';
import { deterministicTailor } from './content';
import { exportPdf, exportDocx } from './export';
import { job, profile, emptyProfile } from './fixtures';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('stores the education year separately instead of duplicating it in the institution text', async () => {
  expect(heuristicProfile(sampleResume).education[0]).toEqual({
    institution: 'Example University, BS Computer Science',
    degree: '',
    year: '2016',
  });
  vi.stubEnv('AI_PROVIDER', 'mock');
  vi.spyOn(mockProvider, 'complete').mockResolvedValue(
    JSON.stringify({
      ...profile,
      education: [
        {
          institution: 'Example University, 2016 | 2016',
          degree: 'BS Computer Science (2016)',
          year: '2016',
        },
      ],
    }),
  );
  expect((await parseProfile(sampleResume)).education[0]).toEqual({
    institution: 'Example University',
    degree: 'BS Computer Science',
    year: '2016',
  });
});
it('exports each year once for legacy embedded years, inline years, and separate years', async () => {
  for (const education of [
    [
      {
        institution: 'Example University, BS Computer Science, 2016',
        degree: '',
        year: '2016',
      },
    ],
    [
      {
        institution: 'Example University',
        degree: 'Class of 2016 with honors',
        year: '2016',
      },
    ],
    [
      {
        institution: 'Example University',
        degree: 'BS Computer Science',
        year: '2016',
      },
    ],
  ]) {
    const content = deterministicTailor({ ...profile, education }, job);
    for (const [bytes, name] of [
      [await exportPdf(content), 'resume.pdf'],
      [await exportDocx(content), 'resume.docx'],
    ] as const) {
      expect(
        (await extractResume(bytes, name)).rawText.match(/\b2016\b/g),
      ).toHaveLength(1);
    }
  }
});
it('keeps education stable through repeated parse/tailor/export/import cycles', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  for (const format of ['pdf', 'docx']) {
    let candidate = await parseProfile(sampleResume);
    const original = candidate.education;
    for (let cycle = 0; cycle < 3; cycle++) {
      const tailored = deterministicTailor(candidate, job);
      const { rawText } = await extractResume(
        format === 'pdf'
          ? await exportPdf(tailored)
          : await exportDocx(tailored),
        `resume.${format}`,
      );
      expect(rawText.match(/\b2016\b/g)).toHaveLength(1);
      candidate = await parseProfile(rawText);
      expect(candidate.education).toEqual(original);
    }
  }
});
it('preserves education without years, handles empty education, and rejects invalid year fields', () => {
  expect(
    heuristicProfile('EDUCATION\nExample University').education[0],
  ).toEqual({ institution: 'Example University', degree: '', year: '' });
  expect(deterministicTailor(emptyProfile, job).education).toEqual([]);
  expect(
    profileSchema.safeParse({
      ...profile,
      education: [{ institution: 'Example', degree: 'BS', year: 2016 }],
    }).success,
  ).toBe(false);
});
