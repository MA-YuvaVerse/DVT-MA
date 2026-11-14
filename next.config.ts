import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker builds set STANDALONE=1; a normal install uses `npm run build && npm start`
  output: process.env.STANDALONE ? "standalone" : undefined,
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
