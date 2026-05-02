import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
