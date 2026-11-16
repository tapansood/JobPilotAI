import type { ProfileData } from '@/lib/profile/schema';
import { detectSkills } from '@/lib/profile/heuristic';
import type { NormalizedJob } from './types';
const words = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z0-9+#.]+/g) || []);
const seniority = (value: string) =>
  /principal|staff|lead/i.test(value)
    ? 4
    : /senior/i.test(value)
      ? 3
      : /junior|entry/i.test(value)
        ? 1
        : 2;
export function scoreJob(profile: ProfileData, job: NormalizedJob) {
  const required = detectSkills(`${job.title}\n${job.description}`);
  const owned = new Set(profile.skills.map((skill) => skill.toLowerCase()));
  const matchedSkills = required.filter((skill) =>
    owned.has(skill.toLowerCase()),
  );
  const missingSkills = required.filter(
    (skill) => !owned.has(skill.toLowerCase()),
  );
  const skills = required.length ? matchedSkills.length / required.length : 0;
  const jobWords = words(job.title);
  const titles = profile.titles.length ? profile.titles : [profile.headline];
  const title = Math.max(
    0,
    ...titles.map((value) => {
      const terms = words(value);
      const union = new Set([...terms, ...jobWords]);
      return union.size
        ? [...terms].filter((term) => jobWords.has(term)).length / union.size
        : 0;
    }),
  );
  const level = profile.seniority || profile.titles.join(' ');
  const hasLevel = /principal|staff|lead|senior|junior|entry/i.test(level);
  const seniorityFit = hasLevel
    ? Math.max(0, 1 - Math.abs(seniority(level) - seniority(job.title)) / 3)
    : 0.5;
  const years = job.description.match(
    /\b(\d{1,2})(?:\s*(?:[-–—]|to)\s*\d{1,2})?\+?\s*(?:years?|yrs?)\s*(?:(?:of|of professional)\s*)?experience/i,
  );
  const yearsFit =
    years && profile.yearsExperience !== null
      ? Math.min(1, profile.yearsExperience / Math.max(1, Number(years[1])))
      : 0.5;
  const fit = (seniorityFit + yearsFit) / 2;
  const location = job.remote
    ? 1
    : profile.locations.length
      ? profile.locations.some(
          (location) =>
            job.location.toLowerCase().includes(location.toLowerCase()) ||
            (location.toLowerCase().includes(job.location.toLowerCase()) &&
              !!job.location),
        )
        ? 1
        : 0
      : 0.5;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(skills * 50 + title * 25 + fit * 15 + location * 10),
    ),
  );
  return {
    score,
    matchedSkills,
    missingSkills,
    reasons: {
      skills: {
        points: Math.round(skills * 50),
        weight: 50,
        text: `${matchedSkills.length} of ${required.length} recognized job skills match. Unspecified skills earn no points.`,
      },
      title: {
        points: Math.round(title * 25),
        weight: 25,
        text: 'Title keyword similarity to your profile.',
      },
      experience: {
        points: Math.round(fit * 15),
        weight: 15,
        text: years
          ? `Posting mentions ${years[1]} years; profile: ${profile.yearsExperience ?? 'unknown'}. Seniority also considered.`
          : 'Years requirement unknown; seniority considered, with neutral credit for unknown data.',
      },
      location: {
        points: Math.round(location * 10),
        weight: 10,
        text: job.remote
          ? 'Remote posting; check geographic eligibility on the original listing.'
          : profile.locations.length
            ? 'Compared posting location with your preferred locations.'
            : 'No preferred location; neutral credit.',
      },
    },
  };
}
