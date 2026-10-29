import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async rewrites() {
    const origin = process.env.JAVA_API_ORIGIN ?? "http://backend:8080";
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
  },
};
export default config;
