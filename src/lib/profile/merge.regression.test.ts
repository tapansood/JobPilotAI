import { afterEach, it, expect, vi } from 'vitest';
import { parseProfile } from './parse';
import { heuristicProfile } from './heuristic';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('keeps non-empty AI contacts including unlabeled location, falling back only for empty fields', async () => {
  vi.stubEnv('AI_PROVIDER', 'openai');
  vi.stubEnv('OPENAI_API_KEY', 'test');
  const raw = 'Alex Morgan\nSeattle, WA\nresume@example.com\n+14155552671';
  const profile = {
    ...heuristicProfile(raw),
    email: 'ai@example.com',
    location: 'Seattle, WA',
    phone: '',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(profile) } }],
          }),
        ),
      ),
    ),
  );
  expect(await parseProfile(raw)).toMatchObject({
    location: 'Seattle, WA',
    email: 'ai@example.com',
    phone: '+14155552671',
  });
});
