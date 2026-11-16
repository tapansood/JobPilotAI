'use client';
import { useEffect, useState } from 'react';
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string;
  position: string;
  linkedinUrl: string | null;
  source: string;
};
const empty = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  position: '',
  linkedinUrl: '',
  connectedOn: '',
};
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState('');
  const [csv, setCsv] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/contacts')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setContacts(data.contacts);
      })
      .catch((error) => setError(error.message));
  }, []);
  async function refresh() {
    const response = await fetch('/api/contacts');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setContacts(data.contacts);
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setForm(empty);
      await refresh();
      setMessage('Contact saved.');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save contact.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!csv) return;
    setBusy(true);
    setError('');
    try {
      if (csv.size > 2 * 1024 * 1024)
        throw new Error('CSV must be 2 MB or smaller.');
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        body: csv,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
      setMessage(
        `Imported ${data.imported} connections. Existing contacts with the same name and company were updated.`,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to import CSV.',
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = contacts.filter((contact) =>
    `${contact.firstName} ${contact.lastName} ${contact.email || ''} ${contact.company} ${contact.position}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-700">
        Your network, thoughtfully connected
      </p>
      <h1 className="mb-4 text-3xl font-semibold">Contacts</h1>
      <p className="mb-7 text-sm leading-6 text-slate-500">
        Import LinkedIn’s official Connections.csv data export, or add someone
        manually. We never scrape LinkedIn or send messages on your behalf.
        Store only contacts you have a legitimate reason to use.
      </p>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-5 text-sm text-teal-800">
          {message}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <form onSubmit={upload} className="panel">
          <h2 className="mb-3 text-lg font-semibold">
            Import LinkedIn connections
          </h2>
          <p className="mb-4 text-sm leading-6 text-slate-500">
            Connections.csv only · Up to 2 MB / 5,000 rows. Notes before the
            column header are supported. Matching name + company updates an
            existing contact.
          </p>
          <label className="sr-only" htmlFor="connections">
            Connections CSV
          </label>
          <input
            id="connections"
            type="file"
            accept=".csv,text/csv"
            required
            disabled={busy}
            className="block w-full text-sm"
            onChange={(event) => setCsv(event.target.files?.[0] || null)}
          />
          <button className="button mt-5" disabled={busy || !csv}>
            {busy ? 'Working…' : 'Import CSV'}
          </button>
        </form>
        <form onSubmit={add} className="panel">
          <h2 className="mb-3 text-lg font-semibold">Add a contact</h2>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {Object.entries({
              firstName: 'First name',
              lastName: 'Last name',
              email: 'Email address',
              company: 'Company',
              position: 'Position',
              linkedinUrl: 'LinkedIn profile URL',
              connectedOn: 'Connected on',
            }).map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  className="input"
                  type={
                    key === 'email'
                      ? 'email'
                      : key === 'connectedOn'
                        ? 'date'
                        : key === 'linkedinUrl'
                          ? 'url'
                          : 'text'
                  }
                  required={key === 'firstName'}
                  value={form[key as keyof typeof form]}
                  maxLength={key === 'linkedinUrl' ? 1000 : 300}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <button className="button sm:col-span-2" disabled={busy}>
              Save contact
            </button>
          </fieldset>
        </form>
      </div>
      <section className="panel mt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Your contacts · {visible.length}
          </h2>
          <input
            aria-label="Search contacts"
            className="input sm:max-w-xs"
            placeholder="Search name, company, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-3">
          {visible.map((contact) => (
            <article key={contact.id} className="rounded-xl border p-4 text-sm">
              <h3 className="font-semibold">
                {contact.firstName} {contact.lastName}
              </h3>
              <p className="my-2 text-slate-500">
                {contact.position}{' '}
                {contact.position && contact.company ? '· ' : ''}
                {contact.company}
              </p>
              <div className="flex flex-wrap gap-4 text-teal-800">
                {contact.email && (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                )}
                {contact.linkedinUrl && (
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn ↗
                  </a>
                )}
                <span className="text-xs text-slate-400">
                  {contact.source === 'LINKEDIN_EXPORT'
                    ? 'LinkedIn export'
                    : 'Manually added'}
                </span>
              </div>
            </article>
          ))}
          {!visible.length && (
            <p className="text-sm text-slate-500">
              No contacts found. Import your export or add your first contact
              above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
