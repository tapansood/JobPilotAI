import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAIProvider } from './index';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('AI providers', () => {
  it('defaults to mock and accepts empty prompts', async () => {
    vi.stubEnv('AI_PROVIDER', '');
    expect(
      await getAIProvider().complete({ system: '', prompt: '' }),
    ).toContain('Mock AI');
    expect(
      JSON.parse(
        await getAIProvider().complete({
          system: '',
          prompt: 'hello',
          json: true,
        }),
      ),
    ).toEqual({ mock: true, text: 'hello' });
  });
  it('rejects unknown providers and missing credentials', () => {
    vi.stubEnv('AI_PROVIDER', 'bad');
    expect(getAIProvider).toThrow('Unsupported');
    vi.stubEnv('AI_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(getAIProvider).toThrow('Missing API key');
  });
  it.each(['openai', 'anthropic'])(
    'reads %s responses and handles failures',
    async (provider) => {
      vi.stubEnv('AI_PROVIDER', provider);
      vi.stubEnv(
        provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
        'test',
      );
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify(
              provider === 'openai'
                ? { choices: [{ message: { content: '{"ok":true}' } }] }
                : { content: [{ type: 'text', text: '{"ok":true}' }] },
            ),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);
      expect(
        await getAIProvider().complete({
          system: 'help',
          prompt: 'hi',
          json: true,
        }),
      ).toBe('{"ok":true}');
      fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
      await expect(
        getAIProvider().complete({ system: '', prompt: '' }),
      ).rejects.toThrow('503');
      fetchMock.mockResolvedValue(new Response('{}'));
      await expect(
        getAIProvider().complete({ system: '', prompt: '' }),
      ).rejects.toThrow('no text');
    },
  );
});
