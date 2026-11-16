import { afterEach, expect, it, vi } from 'vitest';
import {
  deterministicTailor,
  validateTailored,
  tailoredSchema,
  coverTemplate,
} from './content';
import { tailorResume, generateCoverLetter } from './index';
import { mockProvider } from '@/lib/ai';
import { profile, job, emptyProfile } from './fixtures';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('deterministically surfaces supported JD keywords and reports real wording changes', () => {
  const result = deterministicTailor(profile, job);
  expect(result).toEqual(deterministicTailor(profile, job));
  expect(result.skills).toEqual(['Docker', 'TypeScript']);
  expect(result.experience[0].bullets[0]).toBe(
    'Docker focus: Built Docker deployment pipelines.',
  );
  expect(result.keywordCoverage).toEqual({ before: 50, after: 50 });
  expect(result.changes.join('\n')).toContain(
    'TypeScript, Docker → Docker, TypeScript',
  );
  expect(tailoredSchema.safeParse(result).success).toBe(true);
  expect(profile.skills).toEqual(['TypeScript', 'Docker']);
});
it('drops invented companies and skills and restores titles, dates, degrees and all profile identity fields', () => {
  const proposal = {
    ...profile,
    headline: 'CEO',
    summary: 'Managed a billion dollar team.',
    skills: ['docker', 'Quantum Sorcery'],
    titles: ['CEO'],
    yearsExperience: 80,
    locations: ['Mars'],
    seniority: 'Executive',
    experience: [
      {
        company: 'Invented Corp',
        title: 'CEO',
        start: '1900',
        end: '2099',
        bullets: ['Earned a billion dollars.'],
      },
    ],
    education: [
      { institution: 'Invented University', degree: 'PhD', year: '2099' },
    ],
  };
  const result = validateTailored(proposal, profile, job);
  expect(result.skills).toEqual(['Docker']);
  expect(result.headline).toBe(profile.headline);
  expect(result.titles).toEqual(profile.titles);
  expect(result.yearsExperience).toBe(5);
  expect(result.locations).toEqual(profile.locations);
  expect(result.seniority).toBe(profile.seniority);
  expect(result.education).toEqual(profile.education);
  expect(result.experience[0]).toMatchObject({
    company: 'Acme',
    title: 'Engineer',
    start: '2020',
    end: '2025',
  });
  expect(JSON.stringify(result)).not.toMatch(
    /Invented|billion|Quantum|CEO|Mars|PhD/,
  );
});
it('rejects invented claims even when attached to a genuine employer', () => {
  const result = validateTailored(
    {
      ...profile,
      experience: [
        {
          ...profile.experience[0],
          bullets: [
            'Built Docker deployment pipelines.',
            'Used Python to increase revenue 900%.',
          ],
        },
      ],
    },
    profile,
    job,
  );
  expect(result.experience[0].bullets).toEqual([
    'Built Docker deployment pipelines.',
  ]);
});
it('handles empty profiles and rejects malformed proposals', () => {
  expect(
    validateTailored(emptyProfile, emptyProfile, job).keywordCoverage,
  ).toEqual({ before: 0, after: 0 });
  expect(
    deterministicTailor(emptyProfile, { ...job, description: '' }).skills,
  ).toEqual([]);
  expect(() => validateTailored({ skills: 'Python' }, profile, job)).toThrow();
});
it('keeps maximum-length profile text within the output schema', () => {
  const long = {
    ...profile,
    summary: 'x'.repeat(6000),
    experience: [
      { ...profile.experience[0], bullets: [`Docker ${'x'.repeat(1993)}`] },
    ],
  };
  expect(tailoredSchema.safeParse(deterministicTailor(long, job)).success).toBe(
    true,
  );
});
it('runs mock tailoring and cover letters without credentials', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  expect(await tailorResume(profile, job)).toEqual(
    validateTailored(deterministicTailor(profile, job), profile, job),
  );
  expect(await generateCoverLetter(profile, job)).toBe(
    coverTemplate(profile, job),
  );
});
it('enforces the hard rule in the prompt and replaces fabricated cover letter output', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  const complete = vi
    .spyOn(mockProvider, 'complete')
    .mockResolvedValue(
      JSON.stringify({ body: 'I was CEO at Invented Corp and know Python.' }),
    );
  expect(await generateCoverLetter(profile, job)).toBe(
    coverTemplate(profile, job),
  );
  expect(complete.mock.calls[0][0].system).toContain(
    'NEVER invent employers, titles, dates, degrees, skills',
  );
  complete.mockResolvedValue('not JSON');
  await expect(tailorResume(profile, job)).rejects.toThrow();
  await expect(generateCoverLetter(profile, job)).rejects.toThrow();
});
