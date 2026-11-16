import type { ProfileData } from './schema';
type Education = ProfileData['education'][number];
const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function normalizeEducation(entry: Education): Education {
  const year = entry.year.trim();
  if (!year) return entry;
  const trailing = new RegExp(
    `(?:^|[\\s,;|:(–—-]+)${escapePattern(year)}[)\\s.,;|]*$`,
    'i',
  );
  const withoutYear = (value: string) => {
    let previous;
    do {
      previous = value;
      value = value.replace(trailing, '').trim();
    } while (value !== previous);
    return value;
  };
  return {
    ...entry,
    institution: withoutYear(entry.institution),
    degree: withoutYear(entry.degree),
    year,
  };
}
export function educationLine(value: Education) {
  const entry = normalizeEducation(value);
  const facts = [entry.institution, entry.degree].filter(Boolean).join(' | ');
  const containsYear =
    entry.year &&
    new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escapePattern(entry.year)}(?=$|[^\\p{L}\\p{N}])`,
      'iu',
    ).test(facts);
  return [facts, ...(containsYear ? [] : [entry.year])]
    .filter(Boolean)
    .join(' | ');
}
