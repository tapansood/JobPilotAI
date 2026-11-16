export interface SearchInput {
  query: string;
  location: string;
  remote?: boolean;
  page: number;
}
export interface NormalizedJob {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  postedAt: Date | null;
  employmentType: string | null;
}
export interface JobSource {
  name: string;
  search(input: SearchInput): Promise<NormalizedJob[]>;
}
