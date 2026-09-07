import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/market",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
