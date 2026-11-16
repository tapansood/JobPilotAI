import { expect, it } from 'vitest';
import { draftFor, applyDraft } from './draft';
import { deterministicTailor } from './content';
import { profile, job } from './fixtures';
it('keeps trailing comma and newline raw while parsing only on commit', () => {
  const content = deterministicTailor(profile, job),
    draft = draftFor(content);
  draft.skills = 'Docker, ';
  draft.bullets[0] = 'First bullet\n';
  expect(draft.skills).toBe('Docker, ');
  expect(draft.bullets[0]).toBe('First bullet\n');
  draft.skills += 'TypeScript';
  draft.bullets[0] += 'Second bullet';
  const result = applyDraft(content, draft);
  expect(result.skills).toEqual(['Docker', 'TypeScript']);
  expect(result.experience[0].bullets).toEqual([
    'First bullet',
    'Second bullet',
  ]);
  expect(content.experience[0].bullets).not.toContain('First bullet');
});
it('commits empty fields without empty entries', () => {
  const content = deterministicTailor(profile, job);
  expect(applyDraft(content, { skills: ', ', bullets: ['\n'] }).skills).toEqual(
    [],
  );
  expect(
    applyDraft(content, { skills: '', bullets: [] }).experience[0].bullets,
  ).toEqual([]);
});
