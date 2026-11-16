import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse', 'mammoth', 'yauzl'],
  experimental: { cpus: 2 },
};
export default config;
