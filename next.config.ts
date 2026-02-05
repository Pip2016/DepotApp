import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build if needed (types already checked locally)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
