import { db } from '@/lib/db';
import { normalizeCompany, type contactData } from './index';
export async function saveContacts(
  userId: string,
  contacts: ReturnType<typeof contactData>[],
  source: 'MANUAL' | 'LINKEDIN_EXPORT',
) {
  return db.$transaction(
    async (tx) => {
      const result = [];
      for (const contact of contacts) {
        result.push(
          await tx.contact.upsert({
            where: {
              userId_identityKey: { userId, identityKey: contact.identityKey },
            },
            create: { userId, ...contact, source },
            update: { ...contact, source },
          }),
        );
      }
      return result;
    },
    { timeout: 30000 },
  );
}
export async function companyContacts(userId: string, company: string) {
  const target = normalizeCompany(company);
  if (!target) return [];
  const contacts = await db.contact.findMany({
    where: { userId },
    orderBy: { firstName: 'asc' },
  });
  return contacts.filter(
    (contact) => normalizeCompany(contact.company) === target,
  );
}
