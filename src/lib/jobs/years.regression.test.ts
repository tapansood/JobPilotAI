import { expect, it } from 'vitest';
import { scoreJob } from './match';
it('uses the lower bound of experience ranges', () => {
  const profile = {
    headline: 'Engineer',
    summary: '',
    skills: ['Java'],
    titles: ['Engineer'],
    yearsExperience: 3,
    locations: [],
    seniority: 'Senior',
    experience: [],
    education: [],
  };
  const job = {
    source: 'mock',
    externalId: '1',
    title: 'Senior Engineer',
    company: 'Acme',
    location: 'Remote',
    remote: true,
    url: 'https://example.org',
    description: 'Java; 3-5 years experience',
    salaryMin: null,
    salaryMax: null,
    currency: null,
    postedAt: null,
    employmentType: null,
  };
  const lower = scoreJob(profile, {
    ...job,
    description: 'Java; 3 years experience',
  });
  for (const description of [
    'Java; 3-5 years experience',
    'Java; 3–5 years experience',
    'Java; 3 to 5 years of experience',
  ])
    expect(scoreJob(profile, { ...job, description }).score).toBe(lower.score);
});
