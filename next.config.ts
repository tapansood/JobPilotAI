import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  agentRules: false,
  serverExternalPackages: ['pdf-parse', 'mammoth', 'yauzl'],
  experimental: { cpus: 2 },
};
export default config;
