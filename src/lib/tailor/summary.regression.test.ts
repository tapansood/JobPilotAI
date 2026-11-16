import { expect, it } from 'vitest';
import { deterministicTailor, validateTailored } from './content';
import { profile, job, emptyProfile } from './fixtures';
it('replaces an existing relevant-skills sentence and stays stable on repeated tailoring', () => {
  const candidate = {
    ...profile,
    summary:
      'Engineer building reliable services.\n\nRelevant skills: TypeScript.\n\nRelevant skills: Docker.',
  };
  const first = deterministicTailor(candidate, job);
  expect(first.summary).toBe(
    'Engineer building reliable services.\n\nRelevant skills: Docker.',
  );
  const second = deterministicTailor({ ...candidate, ...first }, job);
  expect(second.summary).toBe(first.summary);
  expect(
    validateTailored({ ...first, summary: candidate.summary }, candidate, job)
      .summary,
  ).toBe(first.summary);
});
it('preserves dot-containing skill names and unrelated sentences when replacing an inline sentence', () => {
  const candidate = {
    ...profile,
    skills: ['Node.js', 'Docker'],
    summary: 'Engineer. Relevant skills: Node.js, Docker. Built APIs.',
  };
  const result = deterministicTailor(candidate, job);
  expect(result.summary).toContain('Built APIs.');
  expect(result.summary.match(/Relevant skills:/g)).toHaveLength(1);
  expect(result.summary).not.toContain('Node.js');
});
it('handles empty summaries, stale skills with no current match, and the summary length limit', () => {
  expect(deterministicTailor(emptyProfile, job).summary).toBe('');
  expect(
    deterministicTailor(
      { ...profile, summary: 'Relevant skills: TypeScript.' },
      { ...job, description: 'Python' },
    ).summary,
  ).toBe('');
  expect(
    deterministicTailor({ ...profile, summary: 'a'.repeat(6000) }, job).summary,
  ).toHaveLength(6000);
});
