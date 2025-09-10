/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Allow production builds to successfully complete even if there are ESLint errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: false,
  },
  experimental: {
    esmExternals: true,
  },
};

module.exports = nextConfig;