import { integrationStatus } from '@/lib/integrations';
export default function Settings() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold">Integration settings</h1>
      <p className="my-5 text-sm leading-6 text-slate-500">
        Configuration presence only, not a connection or credential-validity
        test. Change configuration in your private server environment and
        restart the app. Values and secrets are never displayed here.
      </p>
      <div className="panel">
        <ul className="divide-y">
          {integrationStatus().map((integration) => (
            <li
              key={integration.name}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <span className="text-sm font-semibold">{integration.name}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs ${integration.configured ? 'bg-teal-50 text-teal-900' : 'bg-slate-100 text-slate-600'}`}
              >
                {integration.configured
                  ? 'Configured / enabled'
                  : 'Not configured'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5 text-sm text-slate-500">
        Mock AI works offline. Public job boards need no keys. Unconfigured
        SMTP/Twilio use console delivery only in local development; production
        requires real delivery. LinkedIn uses your official export, not an
        account connection. No automated applications or sending.
      </p>
    </div>
  );
}
