import type { NormalizedJob, SearchInput } from '../types';
export async function fetchJson(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return response.json();
}
export const text = (value: unknown) =>
  typeof value === 'string' ? value : '';
export const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
export const date = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? new Date(value)
    : null;
export function plain(value: unknown) {
  return text(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
export const safeUrl = (value: unknown) => {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : '';
  } catch {
    return '';
  }
};
export function filterLocal(jobs: NormalizedJob[], input: SearchInput) {
  const keywords = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  return jobs
    .filter(
      (job) =>
        keywords.every((word) =>
          `${job.title} ${job.description}`.toLowerCase().includes(word),
        ) &&
        (!input.location ||
          job.location.toLowerCase().includes(input.location.toLowerCase())) &&
        (input.remote === undefined || job.remote === input.remote),
    )
    .slice((input.page - 1) * 50, input.page * 50);
}
