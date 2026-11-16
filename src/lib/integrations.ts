export function integrationStatus(
  env: Record<string, string | undefined> = process.env,
) {
  const provider = env.AI_PROVIDER || 'mock';
  const greenhouse = (env.GREENHOUSE_BOARDS ?? 'stripe,cloudflare')
    .split(',')
    .some((value) => value.trim());
  const lever = (env.LEVER_COMPANIES ?? 'netflix')
    .split(',')
    .some((value) => value.trim());
  const adzuna = !!(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY),
    jsearch = !!env.RAPIDAPI_KEY;
  const providerName =
    provider === 'mock'
      ? 'Mock (offline)'
      : provider === 'openai'
        ? 'OpenAI'
        : provider === 'anthropic'
          ? 'Anthropic'
          : 'Unsupported provider';
  return [
    {
      name: `AI · ${providerName}`,
      configured:
        provider === 'mock' ||
        (provider === 'openai' && !!env.OPENAI_API_KEY) ||
        (provider === 'anthropic' && !!env.ANTHROPIC_API_KEY),
    },
    { name: 'Jobs · Adzuna', configured: adzuna },
    { name: 'Jobs · JSearch', configured: jsearch },
    { name: 'Jobs · Greenhouse public boards', configured: greenhouse },
    { name: 'Jobs · Lever public postings', configured: lever },
    {
      name: 'Jobs · Mock offline postings',
      configured:
        env.JOBS_MOCK === 'true' ||
        (!adzuna && !jsearch && !greenhouse && !lever),
    },
    { name: 'Email · SMTP', configured: !!env.SMTP_HOST },
    {
      name: 'SMS · Twilio',
      configured: !!(
        env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        env.TWILIO_FROM
      ),
    },
  ];
}
