import { expect, it } from 'vitest';
import { profile, job } from './fixtures';
import { validateTailored } from './content';
it('pairs repeated identity experience entries by index without copying another entries bullets', () => {
  const original = {
    ...profile,
    experience: [
      { ...profile.experience[0], bullets: ['Wrote documentation.'] },
      {
        ...profile.experience[0],
        bullets: ['Built Docker deployment pipelines.'],
      },
    ],
  };
  expect(validateTailored(original, original, job).experience).toEqual(
    original.experience,
  );
});
