import { z } from 'zod';
import { profileSchema, type ProfileData } from '@/lib/profile/schema';
import { detectSkills } from '@/lib/profile/heuristic';
export const tailoredSchema = profileSchema.extend({
  keywordCoverage: z.object({
    before: z.number().min(0).max(100),
    after: z.number().min(0).max(100),
  }),
  changes: z.array(z.string().max(2000)).max(200),
});
export type TailoredContent = z.infer<typeof tailoredSchema>;
export type TailorJob = { title: string; company: string; description: string };
const norm = (value: string) => value.trim().toLowerCase();
export function optionsFor(profile: ProfileData, job: TailorJob) {
  const keywords = detectSkills(job.description);
  const relevant = profile.skills.filter((skill) =>
    keywords.some((key) => norm(key) === norm(skill)),
  );
  const summary = [
    profile.summary,
    ...(relevant.length
      ? [
          `${profile.summary}${profile.summary ? '\n\n' : ''}Relevant skills: ${relevant.join(', ')}.`,
        ]
      : []),
  ].filter((value) => value.length <= 6000);
  return {
    headlines: [profile.headline, ...profile.titles],
    summaries: summary,
    bullets: profile.experience.map((entry) =>
      entry.bullets.map((bullet) => {
        const matched = detectSkills(bullet).filter((skill) =>
          keywords.some((key) => norm(key) === norm(skill)),
        );
        return [
          bullet,
          ...(matched.length ? [`${matched.join(', ')} focus: ${bullet}`] : []),
        ].filter((value) => value.length <= 2000);
      }),
    ),
  };
}
function coverage(profile: ProfileData, job: TailorJob) {
  const required = detectSkills(job.description);
  const owned = profile.skills.map(norm);
  return required.length
    ? Math.round(
        (required.filter((skill) => owned.includes(norm(skill))).length /
          required.length) *
          100,
      )
    : 0;
}
export function deterministicTailor(
  profile: ProfileData,
  job: TailorJob,
): TailoredContent {
  const keywords = detectSkills(job.description).map(norm);
  const rank = (text: string) =>
    detectSkills(text).filter((skill) => keywords.includes(norm(skill))).length;
  const ordered = [...profile.skills].sort(
    (a, b) =>
      Number(keywords.includes(norm(b))) - Number(keywords.includes(norm(a))),
  );
  const options = optionsFor(profile, job);
  const experience = profile.experience.map((entry, index) => ({
    ...entry,
    bullets: [...entry.bullets]
      .sort((a, b) => rank(b) - rank(a))
      .map((bullet) =>
        options.bullets[index][entry.bullets.indexOf(bullet)].at(-1)!,
      ),
  }));
  const value = coverage(profile, job);
  return {
    ...profile,
    skills: ordered,
    summary: options.summaries.at(-1) || '',
    experience,
    keywordCoverage: { before: value, after: value },
    changes: changesFor(profile, {
      skills: ordered,
      summary: options.summaries.at(-1) || '',
      headline: profile.headline,
      experience,
    }),
  };
}
function changesFor(
  profile: ProfileData,
  content: Pick<ProfileData, 'headline' | 'summary' | 'skills' | 'experience'>,
) {
  const changes: string[] = [];
  if (profile.headline !== content.headline)
    changes.push(`Headline: ${profile.headline} → ${content.headline}`);
  if (profile.summary !== content.summary)
    changes.push(`Summary: ${profile.summary} → ${content.summary}`);
  if (JSON.stringify(profile.skills) !== JSON.stringify(content.skills))
    changes.push(
      `Skills: ${profile.skills.join(', ')} → ${content.skills.join(', ')}`,
    );
  profile.experience.forEach((entry, index) => {
    if (
      JSON.stringify(entry.bullets) !==
      JSON.stringify(content.experience[index].bullets)
    )
      changes.push(
        `${entry.company} · ${entry.title}: ${entry.bullets.join(' | ')} → ${content.experience[index].bullets.join(' | ')}`,
      );
  });
  return (
    changes.length
      ? changes
      : ['No wording changes needed; existing profile facts retained.']
  )
    .slice(0, 190)
    .map((change) =>
      change.length > 2000 ? `${change.slice(0, 1999)}…` : change,
    );
}
export function validateTailored(
  value: unknown,
  profile: ProfileData,
  job: TailorJob,
): TailoredContent {
  const proposal = profileSchema.parse(value);
  const fallback = deterministicTailor(profile, job);
  const options = optionsFor(profile, job);
  const allowedSkills = new Map(
    profile.skills.map((skill) => [norm(skill), skill]),
  );
  const skills = [
    ...new Set(
      proposal.skills
        .map((skill) => allowedSkills.get(norm(skill)))
        .filter((skill): skill is string => !!skill),
    ),
  ];
  const experience = profile.experience.map((original, index) => {
    const entry = proposal.experience[index];
    const candidate =
      entry &&
      entry.company === original.company &&
      entry.title === original.title &&
      entry.start === original.start &&
      entry.end === original.end
        ? entry
        : undefined;
    const allowed = new Set(options.bullets[index].flat());
    return {
      ...original,
      bullets: candidate
        ? candidate.bullets.filter((bullet) => allowed.has(bullet))
        : fallback.experience[index].bullets,
    };
  });
  const content = {
    ...profile,
    headline: options.headlines.includes(proposal.headline)
      ? proposal.headline
      : profile.headline,
    summary: options.summaries.includes(proposal.summary)
      ? proposal.summary
      : fallback.summary,
    skills,
    experience,
  };
  const after = coverage(content, job);
  return tailoredSchema.parse({
    ...content,
    keywordCoverage: { before: coverage(profile, job), after },
    changes: [
      ...changesFor(profile, content),
      ...(proposal.skills.some((skill) => !allowedSkills.has(norm(skill)))
        ? ['Removed skills not present in your profile.']
        : []),
      ...(JSON.stringify(proposal.education) !==
      JSON.stringify(profile.education)
        ? ['Restored education from your profile.']
        : []),
    ],
  });
}
export function coverTemplate(profile: ProfileData, job: TailorJob) {
  const relevant = deterministicTailor(profile, job).skills;
  return `Dear Hiring Team,\n\nI am interested in the ${job.title} role at ${job.company}.\n\n${profile.summary}${relevant.length ? `\n\nMy profile includes these skills: ${relevant.join(', ')}.` : ''}\n\nI would welcome the opportunity to discuss how my experience could support your team. Thank you for considering my application.\n\nBest regards,\n${profile.fullName?.trim() || '[Your name]'}`;
}
