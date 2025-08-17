import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not block production builds on ESLint issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Cast to any because this experimental flag may not yet be in the published TS types for your Next version
  experimental: ({
    // Allow loading dev assets from the LAN IP during development
    allowedDevOrigins: ["http://192.168.100.17:3000"],
  } as any),
};

export default nextConfig;
