import { profileSchema, type ProfileData } from './schema';
import { normalizeEducation } from './education';
const skills = [
  'JavaScript',
  'TypeScript',
  'Java',
  'Python',
  'C++',
  'C#',
  '.NET',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'SQL',
  'HTML',
  'CSS',
  'React',
  'Next.js',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Spring Boot',
  'Django',
  'Flask',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'DynamoDB',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Ansible',
  'Linux',
  'Git',
  'GitHub Actions',
  'Jenkins',
  'CI/CD',
  'REST',
  'GraphQL',
  'Kafka',
  'RabbitMQ',
  'Spark',
  'Hadoop',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'Agile',
  'Scrum',
  'Selenium',
  'Jest',
  'Vitest',
  'Playwright',
  'Cypress',
  'PowerShell',
  'Bash',
  'Networking',
  'Cybersecurity',
];
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function detectSkills(text: string) {
  return skills.filter((skill) =>
    new RegExp(
      `(?:^|[^a-zA-Z0-9])${escaped(skill)}(?=$|[^a-zA-Z0-9+#])`,
      'i',
    ).test(text),
  );
}
function isPhone(value: string) {
  const digits = value.replace(/\D/g, '').length;
  return (
    /^\+?\d[\d ().-]{7,}\d$/.test(value) &&
    digits >= 10 &&
    digits <= 15 &&
    !/\b(?:19|20)\d{2}\s*[-.]\s*(?:19|20)\d{2}\b/.test(value)
  );
}
function validContact(value: string, isUrl: boolean) {
  return isUrl
    ? profileSchema.shape.website.safeParse(
        value.replace(/^www\./i, 'https://www.'),
      ).success
    : profileSchema.shape.email.safeParse(value).success;
}
function phoneFragment(value: string) {
  const digits = value.replace(/\D/g, '').length;
  return (
    /^\+?\d[\d ().-]*$/.test(value) && (digits >= 7 || /[+(). -]/.test(value))
  );
}
function unwrapContacts(text: string) {
  const boundary =
    /^(?:summary|profile|skills|experience|education|contact|certifications|projects|notes)$/i;
  const starts =
    /(?:https?:\/\/|www\.)[^\s<>()|]*|[A-Z0-9._%+-]+(?:@[A-Z0-9.-]*)?/gi;
  let output = '';
  let copied = 0;
  let match: RegExpExecArray | null;
  while ((match = starts.exec(text))) {
    let token = match[0];
    let end = starts.lastIndex;
    const originalEnd = end;
    const isUrl = /^(?:https?:\/\/|www\.)/i.test(token);
    if (phoneFragment(token) || boundary.test(token)) continue;
    const beforeToken = text.slice(
      text.lastIndexOf('\n', match.index - 1) + 1,
      match.index,
    );
    const emailLabel = /^[ \t]*email[ \t]*:[ \t]*$/i.test(beforeToken);
    const wholeEmailLine = !beforeToken.trim() || emailLabel;
    const clearEmailPrefix = token.includes('@') || /[._@-]$/.test(token);
    const localPrefix =
      (wholeEmailLine || clearEmailPrefix) &&
      (token.includes('@') ||
        /[._%+-]/.test(token) ||
        /^[a-z0-9]{1,3}$/.test(token) ||
        emailLabel);
    while (token.length <= 1000) {
      const next = text
        .slice(end)
        .match(
          /^[ \t]*\r?\n[ \t]*([A-Z0-9._~:/?#=&%+@-]{1,100})(?=[ \t]*(?:\r?\n|$|[|]))/i,
        );
      if (!next) break;
      const fragment = next[1];
      if (
        boundary.test(fragment) ||
        phoneFragment(fragment) ||
        /^(?:https?:\/\/|www\.)/i.test(fragment)
      )
        break;
      const combined = token + fragment;
      if (isUrl) {
        if (
          fragment.includes('@') ||
          fragment.endsWith(':') ||
          /^[A-Z][A-Za-z0-9_-]*$/.test(fragment) ||
          !validContact(combined, true)
        )
          break;
      } else {
        const midEmail =
          !validContact(token, false) ||
          /[.-]$/.test(token) ||
          /[.@]/.test(fragment) ||
          /^[a-z]{1,3}$/.test(fragment);
        if (
          !localPrefix ||
          !midEmail ||
          (!wholeEmailLine && validContact(fragment, false)) ||
          (token.includes('@') && fragment.includes('@')) ||
          !/^[A-Z0-9_%+-][A-Z0-9._%+-]*(?:@[A-Z0-9.-]*)?$/i.test(combined) ||
          combined.includes('..') ||
          combined.includes('@.')
        )
          break;
      }
      token = combined;
      end += next[0].length;
    }
    if (end !== originalEnd && validContact(token, isUrl)) {
      output += text.slice(copied, match.index) + token;
      copied = end;
      starts.lastIndex = end;
    }
  }
  return output + text.slice(copied);
}
export function extractContact(text: string) {
  const phone = [...text.matchAll(/\+?\d[\d ().-]{7,}\d/g)]
    .map((match) => match[0].trim())
    .find(isPhone);
  return {
    email:
      unwrapContacts(text).match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      )?.[0] || null,
    phone: phone || null,
  };
}
export function profileContacts(text: string) {
  text = unwrapContacts(text);
  const contact = extractContact(text);
  const links = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>()]+/gi)]
    .map((match) => match[0].replace(/[.,;]+$/, ''))
    .map((value) => (value.startsWith('www.') ? `https://${value}` : value));
  const linkedinUrl =
    links.find((value) => {
      try {
        const url = new URL(value);
        return (
          /^(www\.)?linkedin\.com$/i.test(url.hostname) &&
          url.pathname.startsWith('/in/')
        );
      } catch {
        return false;
      }
    }) || '';
  const website = links.find((value) => value !== linkedinUrl) || '';
  return {
    fullName: resumeName(text),
    email: contact.email || '',
    phone: contact.phone || '',
    linkedinUrl,
    website,
    location:
      text.match(/^(?:location|based in|address)\s*:\s*(.+)$/im)?.[1]?.trim() ||
      '',
  };
}
function resumeName(text: string) {
  const line =
    text
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .find((value) => !/^(?:resume|curriculum vitae|cv)$/i.test(value)) || '';
  const candidate = line
    .replace(/^(?:full\s*)?name\s*:\s*/i, '')
    .split(/\s+[|•]\s+/)[0]
    .trim();
  const words = candidate.split(/\s+/);
  if (
    words.length < 2 ||
    words.length > 5 ||
    candidate.length > 200 ||
    !/^[\p{L}\p{M}][\p{L}\p{M}.'’ -]+$/u.test(candidate) ||
    /\b(?:engineer|developer|architect|analyst|administrator|manager|scientist|specialist|consultant|summary|profile|skills|education|experience|professional|resume)\b/i.test(
      candidate,
    )
  )
    return '';
  return candidate;
}
export function heuristicProfile(text: string): ProfileData {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: ProfileData = {
    ...profileContacts(text),
    headline: '',
    summary: '',
    skills: [],
    titles: [],
    yearsExperience: null,
    locations: [],
    seniority: '',
    experience: [],
    education: [],
  };
  result.skills = detectSkills(text);
  const years = text.match(
    /(\d{1,2}(?:\.\d)?)\+?\s*years?\s+(?:(?:of|in|of professional)\s+)?experience/i,
  );
  if (years) result.yearsExperience = Math.min(80, Number(years[1]));
  const titlePattern =
    /\b(?:(?:senior|junior|lead|principal|staff|full[ -]stack|front[ -]end|back[ -]end|software|cloud|data|devops|site reliability|security|IT|platform|engineering|technical)\s+){1,4}(?:engineer|developer|architect|analyst|administrator|manager|scientist|specialist|consultant)\b/gi;
  result.titles = [...new Set(text.match(titlePattern) || [])].slice(0, 30);
  result.headline = result.titles[0] || 'IT professional';
  result.seniority =
    text.match(/\b(principal|staff|senior|lead|junior|entry.level)\b/i)?.[0] ||
    '';
  let section = '';
  const summary: string[] = [];
  for (const line of lines) {
    const header = line.replace(/:$/, '').toLowerCase();
    if (
      /^(summary|professional summary|profile|objective|experience|work experience|professional experience|employment|education|skills|technical skills|certifications|projects|contact|locations?)$/.test(
        header,
      )
    ) {
      section = header;
      continue;
    }
    const location = line.match(/^(?:location|based in|address)\s*:\s*(.+)$/i);
    if (location) result.locations.push(location[1]);
    else if (/^locations?$/.test(section)) result.locations.push(line);
    if (/summary|profile|objective/.test(section)) summary.push(line);
    if (/experience|employment/.test(section)) {
      const dates = line.match(
        /((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2}|present|current)/i,
      );
      const title = line.match(titlePattern)?.[0];
      if (title) {
        const company = line
          .replace(title, '')
          .replace(
            /\(?((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2}|present|current)\)?/i,
            '',
          )
          .replace(/^[\s|,@–—-]+|[\s|,@–—-]+$/g, '')
          .replace(/^at\s+/i, '');
        result.experience.push({
          company,
          title,
          start: dates?.[1] || '',
          end: dates?.[2] || '',
          bullets: [],
        });
      } else if (result.experience.length) {
        const current = result.experience[result.experience.length - 1];
        if (dates) {
          current.start = dates[1];
          current.end = dates[2];
        } else if (/^[•*\-]/.test(line))
          current.bullets.push(line.replace(/^[•*\-]\s*/, ''));
        else if (!current.company) current.company = line;
      }
    }
    if (section === 'education')
      result.education.push(
        normalizeEducation({
          institution: line,
          degree: '',
          year: line.match(/\b(?:19|20)\d{2}\b/)?.[0] || '',
        }),
      );
  }
  const contact = extractContact(text);
  result.summary =
    summary.join(' ').slice(0, 6000) ||
    lines
      .filter(
        (line) =>
          line !== contact.email &&
          !line.includes(contact.email || '\0') &&
          !line.includes(contact.phone || '\0'),
      )
      .slice(0, 3)
      .join(' ')
      .slice(0, 6000);
  result.locations = [...new Set(result.locations)].slice(0, 30);
  if (contact.email)
    result.summary = result.summary.replaceAll(contact.email, '').trim();
  if (contact.phone)
    result.summary = result.summary.replaceAll(contact.phone, '').trim();
  return result;
}
