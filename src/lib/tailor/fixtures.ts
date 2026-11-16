import type { ProfileData } from '@/lib/profile/schema';
export const profile: ProfileData = {
  headline: 'Software Engineer',
  summary: 'Engineer building reliable services.',
  skills: ['TypeScript', 'Docker'],
  titles: ['Software Engineer'],
  yearsExperience: 5,
  locations: ['Seattle'],
  seniority: 'Mid',
  experience: [
    {
      company: 'Acme',
      title: 'Engineer',
      start: '2020',
      end: '2025',
      bullets: ['Wrote documentation.', 'Built Docker deployment pipelines.'],
    },
  ],
  education: [
    {
      institution: 'Example University',
      degree: 'BS Computer Science',
      year: '2020',
    },
  ],
};
export const job = {
  title: 'Platform Engineer',
  company: 'Northstar Cloud',
  description: 'Build Docker services and Python tools.',
};
export const emptyProfile: ProfileData = {
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
