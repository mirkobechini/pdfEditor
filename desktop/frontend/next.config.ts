import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "309361418291-0j2jpuk4sdft5hm9tdvpj1n4trukphee.apps.googleusercontent.com",
  },
};

export default nextConfig;
