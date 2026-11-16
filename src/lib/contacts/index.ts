import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export function normalizeCompany(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f.]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(
      /(?:\s+(?:incorporated|inc|llc|corporation|corp|ltd|limited|co))+$/g,
      '',
    )
    .trim();
}
export function linkedinUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['linkedin.com', 'www.linkedin.com'].includes(url.hostname) ||
      !url.pathname.startsWith('/in/')
    )
      throw new Error();
    url.search = '';
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    throw new Error('Use a valid https://www.linkedin.com/in/ profile URL.');
  }
}
const value = z.string().trim().max(300);
export const contactSchema = z.object({
  firstName: value.min(1),
  lastName: value,
  company: value,
  position: value,
  email: z.union([z.email(), z.literal('')]).default(''),
  linkedinUrl: z.string().max(1000).default(''),
  connectedOn: z.string().max(50).default(''),
});
export function contactData(input: z.infer<typeof contactSchema>) {
  const linkedin = linkedinUrl(input.linkedinUrl);
  let connectedOn: Date | null = null;
  if (input.connectedOn) {
    const parsed = Date.parse(input.connectedOn);
    if (Number.isNaN(parsed)) throw new Error('Invalid connection date.');
    connectedOn = new Date(parsed);
  }
  const identityKey = createHash('sha256')
    .update(
      [input.firstName, input.lastName, normalizeCompany(input.company)]
        .map((value) => value.trim().toLowerCase())
        .join('|'),
    )
    .digest('hex');
  return {
    ...input,
    email: input.email.toLowerCase() || null,
    linkedinUrl: linkedin,
    connectedOn,
    identityKey,
  };
}
export function parseConnections(csv: string) {
  if (Buffer.byteLength(csv) > MAX_CSV_BYTES)
    throw new Error('CSV must be 2 MB or smaller.');
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /^"?First Name"?,"?Last Name"?,/.test(line),
  );
  if (start < 0) throw new Error('LinkedIn Connections.csv header not found.');
  const rows: Record<string, string>[] = parse(lines.slice(start).join('\n'), {
    columns: (header: string[]) => {
      const required = [
        'First Name',
        'Last Name',
        'URL',
        'Email Address',
        'Company',
        'Position',
        'Connected On',
      ];
      if (required.some((column) => !header.includes(column)))
        throw new Error('Missing LinkedIn Connections.csv columns.');
      return header;
    },
    skip_empty_lines: true,
    bom: true,
    trim: true,
    max_record_size: 20000,
  });
  if (rows.length > 5000)
    throw new Error('Import at most 5,000 connections at a time.');
  return rows.map((row, index) => {
    const input = contactSchema.safeParse({
      firstName: row['First Name'] || '',
      lastName: row['Last Name'] || '',
      email: row['Email Address'] || '',
      company: row.Company || '',
      position: row.Position || '',
      linkedinUrl: row.URL || '',
      connectedOn: row['Connected On'] || '',
    });
    if (!input.success)
      throw new Error(
        `Invalid connection on CSV row ${index + 2}. Check names and email addresses.`,
      );
    return contactData(input.data);
  });
}
