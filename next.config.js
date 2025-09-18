/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for development
  // output: 'standalone',
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
  // Updated turbopack configuration
  turbopack: {
    rules: {
      // Add any specific turbopack rules if needed
    }
  },
};

module.exports = nextConfig;