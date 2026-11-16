import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractContact, heuristicProfile } from './heuristic';
import { parseProfile } from './parse';
import { profileSchema } from './schema';
import { sampleResume } from './fixtures';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('profile parsing', () => {
  it('extracts useful repeatable mock profiles and contact details', async () => {
    vi.stubEnv('AI_PROVIDER', 'mock');
    const profile = await parseProfile(sampleResume);
    expect(profile).toEqual(await parseProfile(sampleResume));
    expect(profile.skills).toEqual(
      expect.arrayContaining(['TypeScript', 'AWS', 'C++', 'C#', '.NET']),
    );
    expect(profile.headline).toBe('Senior Software Engineer');
    expect(profile.yearsExperience).toBe(8);
    expect(profile.locations).toEqual(['Seattle, WA']);
    expect(profile.experience[0]).toMatchObject({
      company: 'Acme',
      start: '2020',
      end: 'Present',
      bullets: ['Built APIs serving thousands of users.'],
    });
    expect(profile.summary).toBe(
      'Software engineer with 8 years of experience building reliable services.',
    );
    expect(profile.education[0].institution).toContain('Example University');
    expect(extractContact(sampleResume)).toEqual({
      email: 'alex@example.com',
      phone: '+14155552671',
    });
  });
  it('handles empty/missing sections and avoids substring skill matches', () => {
    expect(profileSchema.safeParse(heuristicProfile('')).success).toBe(true);
    expect(heuristicProfile('Oregon Django').skills).toEqual(['Django']);
    expect(heuristicProfile('JavaScript').skills).not.toContain('Java');
    expect(heuristicProfile('hello').yearsExperience).toBeNull();
  });
  it('rejects empty input, excessive text and invalid provider JSON/schema', async () => {
    await expect(parseProfile(' ')).rejects.toThrow('No readable text');
    await expect(parseProfile('x'.repeat(100001))).rejects.toThrow('too long');
    vi.stubEnv('AI_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', 'test');
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{}' } }] }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    await expect(parseProfile('resume')).rejects.toThrow();
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'not json' } }] }),
      ),
    );
    await expect(parseProfile('resume')).rejects.toThrow();
  });
});
