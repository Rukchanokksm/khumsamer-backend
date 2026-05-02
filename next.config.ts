import type { NextConfig } from "next";

// อ่าน frontend origin แรกจาก env เพื่อใส่เป็น CORS header แบบ static
// (next.config.ts headers() เชื่อถือได้กว่า middleware เพราะรันที่ Vercel edge)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGINS?.split(",")[0]?.trim() ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    if (!FRONTEND_ORIGIN) return [];
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: FRONTEND_ORIGIN },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
          { key: "Access-Control-Max-Age", value: "86400" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
