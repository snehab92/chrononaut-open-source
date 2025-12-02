import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled cacheComponents - causing build issues with auth routes
  // cacheComponents: true,
};

export default nextConfig;
