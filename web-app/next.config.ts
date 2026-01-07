import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mediapipe/pose': path.resolve(__dirname, 'src/lib/mediapipe-dummy.ts'),
    };
    return config;
  },
  experimental: {
    // @ts-expect-error - Turbo config is valid in Next.js 15+ but types might lag
    turbo: {
      resolveAlias: {
        '@mediapipe/pose': './src/lib/mediapipe-dummy.ts',
      },
    },
  },
};

export default nextConfig;
