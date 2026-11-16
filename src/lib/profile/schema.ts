import { z } from 'zod';
const text = z.string().trim().max(500);
const contactUrl = z
  .union([
    z
      .url()
      .max(1000)
      .refine((value) => /^https?:\/\//i.test(value)),
    z.literal(''),
  ])
  .optional();
export const profileSchema = z.object({
  fullName: z.string().trim().max(200).optional(),
  email: z.union([z.email(), z.literal('')]).optional(),
  phone: z.string().trim().max(100).optional(),
  linkedinUrl: contactUrl,
  website: contactUrl,
  location: text.optional(),
  headline: text,
  summary: z.string().trim().max(6000),
  skills: z.array(text.min(1)).max(100),
  titles: z.array(text.min(1)).max(30),
  yearsExperience: z.number().min(0).max(80).nullable(),
  locations: z.array(text.min(1)).max(30),
  seniority: text,
  experience: z
    .array(
      z.object({
        company: text,
        title: text,
        start: text,
        end: text,
        bullets: z.array(z.string().max(2000)).max(40),
      }),
    )
    .max(50),
  education: z
    .array(z.object({ institution: text, degree: text, year: text }))
    .max(30),
});
export type ProfileData = z.infer<typeof profileSchema>;
