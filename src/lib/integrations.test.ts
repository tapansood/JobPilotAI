import { expect, it } from 'vitest';
import { integrationStatus } from './integrations';
it('shows defaults and offline fallback without configuration values', () => {
  const defaults = integrationStatus({});
  expect(
    defaults.find((row) => row.name === 'AI · Mock (offline)')?.configured,
  ).toBe(true);
  expect(
    defaults.find((row) => row.name === 'Jobs · Greenhouse public boards')
      ?.configured,
  ).toBe(true);
  const offline = integrationStatus({
    GREENHOUSE_BOARDS: '',
    LEVER_COMPANIES: '',
  });
  expect(
    offline.find((row) => row.name === 'Jobs · Mock offline postings')
      ?.configured,
  ).toBe(true);
});
it('reports configured integrations and redacts credentials, endpoints and unsupported provider values', () => {
  const secret = 'DO_NOT_EXPOSE_123';
  const rows = integrationStatus({
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: secret,
    ADZUNA_APP_ID: secret,
    ADZUNA_APP_KEY: secret,
    RAPIDAPI_KEY: secret,
    SMTP_HOST: secret,
    TWILIO_ACCOUNT_SID: secret,
    TWILIO_AUTH_TOKEN: secret,
    TWILIO_FROM: secret,
    GREENHOUSE_BOARDS: secret,
  });
  expect(
    rows
      .filter((row) => row.name !== 'Jobs · Mock offline postings')
      .every((row) => row.configured),
  ).toBe(true);
  expect(JSON.stringify(rows)).not.toContain(secret);
  expect(
    JSON.stringify(integrationStatus({ AI_PROVIDER: secret })),
  ).not.toContain(secret);
  expect(
    integrationStatus({ AI_PROVIDER: 'anthropic' }).find(
      (row) => row.name === 'AI · Anthropic',
    )?.configured,
  ).toBe(false);
});
