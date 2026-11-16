import type { JobSource, NormalizedJob } from '../types';
import { filterLocal } from './shared';
const samples = [
  [
    '1',
    'Senior Software Engineer',
    'Northstar Cloud',
    'Seattle, WA',
    true,
    'TypeScript React Node.js PostgreSQL AWS Docker. Build reliable APIs. 5+ years experience.',
  ],
  [
    '2',
    'Software Engineer',
    'Harbor Systems',
    'New York, NY',
    false,
    'Java Spring Boot SQL AWS. Develop distributed systems. 3 years experience.',
  ],
  [
    '3',
    'Senior DevOps Engineer',
    'Cedar Labs',
    'Remote',
    true,
    'Kubernetes Docker Terraform AWS Linux Python CI/CD. 6 years experience.',
  ],
  [
    '4',
    'Data Engineer',
    'Orbit Analytics',
    'San Francisco, CA',
    true,
    'Python SQL Spark Kafka AWS. Design data pipelines. 4 years experience.',
  ],
  [
    '5',
    'Frontend Developer',
    'Brightside Software',
    'Austin, TX',
    false,
    'JavaScript TypeScript React CSS HTML Jest. 2 years experience.',
  ],
  [
    '6',
    'Junior Software Engineer',
    'Northstar Cloud',
    'Remote',
    true,
    'JavaScript React Node.js Git. Learn with a supportive team. 1 year experience.',
  ],
] as const;
export const mock: JobSource = {
  name: 'mock',
  async search(input) {
    const jobs: NormalizedJob[] = samples.map(
      ([id, title, company, location, remote, description]) => ({
        source: 'mock',
        externalId: id,
        title,
        company,
        location,
        remote,
        url: `https://example.com/jobs/${id}`,
        description: `DEMO POSTING — not an actual vacancy. ${description}`,
        salaryMin: 90000,
        salaryMax: 180000,
        currency: 'USD',
        postedAt: new Date('2026-11-01'),
        employmentType: 'FULL_TIME',
      }),
    );
    return filterLocal(jobs, input);
  },
};
