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
};

export default nextConfig;
