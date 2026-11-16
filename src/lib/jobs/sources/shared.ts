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
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    nbsp: ' ',
    quot: '"',
    apos: "'",
    ndash: '–',
    mdash: '—',
    bull: '•',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
  };
  let decoded = text(value);
  for (let pass = 0; pass < 5; pass++) {
    const next = decoded.replace(
      /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
      (whole, entity: string) => {
        if (entity.startsWith('#')) {
          const point =
            entity[1].toLowerCase() === 'x'
              ? parseInt(entity.slice(2), 16)
              : parseInt(entity.slice(1), 10);
          return point > 0 &&
            point <= 0x10ffff &&
            !(point >= 0xd800 && point <= 0xdfff)
            ? String.fromCodePoint(point)
            : '';
        }
        return entities[entity.toLowerCase()] ?? whole;
      },
    );
    if (next === decoded) break;
    decoded = next;
  }
  return decoded
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
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
