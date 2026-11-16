import type { TailoredContent } from './content';
export function draftFor(content: TailoredContent) {
  return {
    skills: content.skills.join(', '),
    bullets: content.experience.map((entry) => entry.bullets.join('\n')),
  };
}
export type TextDraft = ReturnType<typeof draftFor>;
export function applyDraft(
  content: TailoredContent,
  draft: TextDraft,
): TailoredContent {
  return {
    ...content,
    skills: draft.skills
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    experience: content.experience.map((entry, index) => ({
      ...entry,
      bullets: (draft.bullets[index] ?? '')
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean),
    })),
  };
}
