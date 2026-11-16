import type { ProfileData } from './schema';
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
export function extractContact(text: string) {
  return {
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null,
    phone: text.match(/\+?\d[\d ().-]{7,}\d/)?.[0]?.trim() || null,
  };
}
export function heuristicProfile(text: string): ProfileData {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: ProfileData = {
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
  result.skills = skills.filter((skill) =>
    new RegExp(
      `(?:^|[^a-zA-Z0-9])${escaped(skill)}(?=$|[^a-zA-Z0-9+#])`,
      'i',
    ).test(text),
  );
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
      result.education.push({
        institution: line,
        degree: '',
        year: line.match(/\b(?:19|20)\d{2}\b/)?.[0] || '',
      });
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
