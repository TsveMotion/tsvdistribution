import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not block production builds on ESLint issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
