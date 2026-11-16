import { afterEach, expect, it, vi } from 'vitest';
import { parseProfile } from '@/lib/profile/parse';
import { sampleResume } from '@/lib/profile/fixtures';
import { heuristicProfile } from '@/lib/profile/heuristic';
import { profileSchema } from '@/lib/profile/schema';
import { extractResume } from '@/lib/profile/extract';
import {
  coverTemplate,
  deterministicTailor,
  validateTailored,
} from './content';
import { exportDocx, exportPdf } from './export';
import { outreachDrafts } from '@/lib/outreach';
import { job, profile } from './fixtures';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('parses the candidate name from the resume top line and preserves edits', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  const parsed = await parseProfile(sampleResume);
  expect(parsed).toMatchObject({ fullName: 'Alex Morgan' });
  expect(
    profileSchema.parse({ ...parsed, fullName: 'Alex J. Morgan' }),
  ).toMatchObject({ fullName: 'Alex J. Morgan' });
  expect(
    heuristicProfile('RESUME\nAlex Morgan\nSoftware Engineer'),
  ).toMatchObject({ fullName: 'Alex Morgan' });
});
it('keeps unknown names empty, rejects invalid edits, and uses placeholders rather than inventing a name', async () => {
  expect(heuristicProfile('')).toMatchObject({ fullName: '' });
  expect(
    heuristicProfile('Senior Software Engineer\nSkills\nTypeScript'),
  ).toMatchObject({ fullName: '' });
  expect(profileSchema.safeParse({ ...profile, fullName: 123 }).success).toBe(
    false,
  );
  expect(coverTemplate(profile, job)).toContain('[Your name]');
  expect(outreachDrafts(profile, job)[0].body).toContain('[Your name]');
});
it('accepts an AI-extracted name and fills blank AI names from the top line', async () => {
  vi.stubEnv('AI_PROVIDER', 'openai');
  vi.stubEnv('OPENAI_API_KEY', 'test');
  const proposal = {
    ...heuristicProfile(sampleResume),
    fullName: 'Alex J. Morgan',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(proposal) } }],
          }),
        ),
      ),
    ),
  );
  expect(await parseProfile(sampleResume)).toMatchObject({
    fullName: 'Alex J. Morgan',
  });
  proposal.fullName = '';
  expect(await parseProfile(sampleResume)).toMatchObject({
    fullName: 'Alex Morgan',
  });
});
it('puts the candidate name first in both exports and signs cover letters and every outreach channel', async () => {
  vi.stubEnv('AI_PROVIDER', 'mock');
  const candidate = await parseProfile(sampleResume);
  const tailored = deterministicTailor(candidate, job);
  for (const [bytes, name] of [
    [await exportPdf(tailored), 'resume.pdf'],
    [await exportDocx(tailored), 'resume.docx'],
  ] as const) {
    expect(
      (await extractResume(bytes, name)).rawText
        .trimStart()
        .startsWith('Alex Morgan'),
    ).toBe(true);
  }
  expect(coverTemplate(candidate, job).endsWith('Alex Morgan')).toBe(true);
  const drafts = outreachDrafts(candidate, job, {
    id: 'c1',
    firstName: 'Jamie',
  });
  for (const draft of drafts)
    expect(draft.body.endsWith('Alex Morgan')).toBe(true);
  expect(
    drafts.find((d) => d.channel === 'LINKEDIN')!.body.length,
  ).toBeLessThanOrEqual(300);
  expect(
    validateTailored(
      { ...tailored, fullName: 'Invented Name' },
      candidate,
      job,
    ),
  ).toMatchObject({ fullName: 'Alex Morgan' });
});
