import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  timeZone: "Europe/Rome",
};

export default nextConfig;
