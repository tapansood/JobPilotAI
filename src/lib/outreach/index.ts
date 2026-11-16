import type { ProfileData } from '@/lib/profile/schema';
import type { TailorJob } from '@/lib/tailor/content';
export function outreachDrafts(
  profile: ProfileData,
  job: TailorJob,
  contact?: { id: string; firstName: string },
) {
  const subject = `${job.title} opportunity at ${job.company}`.replace(
    /[\r\n]/g,
    ' ',
  );
  const greeting = contact ? `Hi ${contact.firstName},` : 'Hello Hiring Team,';
  const skills = profile.skills.slice(0, 5).join(', ');
  const body = `${greeting}\n\nI’m interested in the ${job.title} role at ${job.company}.${skills ? ` My profile includes ${skills}.` : ''}\n\n${contact ? 'Would you be comfortable sharing any advice about the team or considering a referral? No worries if not.' : 'Could you point me toward the right person to discuss this opportunity?'}\n\nThank you for your time,\n[Your name]`;
  const note = `Hi ${contact?.firstName || 'there'}, I’m exploring the ${job.title} role at ${job.company}. I’d appreciate connecting and any advice you’re comfortable sharing. Thank you!`;
  const short =
    note.length <= 300
      ? note
      : `Hi ${contact?.firstName.slice(0, 60) || 'there'}, I’m exploring an opportunity at ${job.company.slice(0, 100)}. I’d appreciate connecting and any advice you’re comfortable sharing. Thank you!`;
  return [
    ...(contact
      ? [
          {
            channel: 'LINKEDIN' as const,
            subject: '',
            body: short.slice(0, 300),
            contactId: contact.id,
          },
        ]
      : []),
    {
      channel: 'EMAIL' as const,
      subject,
      body,
      contactId: contact?.id ?? null,
    },
  ];
}
