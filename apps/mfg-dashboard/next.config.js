/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@b2b/prisma-schema'],
};

module.exports = nextConfig;
