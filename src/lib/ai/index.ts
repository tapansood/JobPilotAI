import { heuristicProfile } from '@/lib/profile/heuristic';
export interface CompletionRequest {
  system: string;
  prompt: string;
  json?: boolean;
}
export interface AIProvider {
  complete(request: CompletionRequest): Promise<string>;
}
export const mockProvider: AIProvider = {
  async complete({ system, prompt, json }) {
    if (system.startsWith('JOBPILOT_PROFILE_V1:'))
      return JSON.stringify(heuristicProfile(prompt));
    return json
      ? JSON.stringify({ mock: true, text: prompt })
      : `[Mock AI — configure a provider for real suggestions]\n${prompt}`;
  },
};
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'mock';
  if (provider === 'mock') return mockProvider;
  if (provider !== 'openai' && provider !== 'anthropic')
    throw new Error('Unsupported AI_PROVIDER');
  const key =
    provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error(`Missing API key for ${provider}`);
  return {
    async complete({ system, prompt, json }) {
      const openai = provider === 'openai';
      const response = await fetch(
        openai
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          signal: AbortSignal.timeout(60000),
          headers: openai
            ? {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
              }
            : {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
              },
          body: JSON.stringify(
            openai
              ? {
                  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                  ],
                  ...(json ? { response_format: { type: 'json_object' } } : {}),
                }
              : {
                  model:
                    process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
                  max_tokens: 4096,
                  system:
                    system + (json ? '\nRespond with valid JSON only.' : ''),
                  messages: [{ role: 'user', content: prompt }],
                },
          ),
        },
      );
      if (!response.ok)
        throw new Error(`AI provider request failed (${response.status})`);
      const data = await response.json();
      const output: unknown = openai
        ? data.choices?.[0]?.message?.content
        : data.content
            ?.filter((block: { type: string }) => block.type === 'text')
            .map((block: { text: string }) => block.text)
            .join('');
      if (typeof output !== 'string' || !output)
        throw new Error('AI provider returned no text');
      if (json) JSON.parse(output);
      return output;
    },
  };
}
