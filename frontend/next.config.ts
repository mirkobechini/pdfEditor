import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // In static export, NEXT_PUBLIC_* vars are inlined at build time.
  // This fallback ensures the Google Client ID is available even when
  // the CI build doesn't have the env var set (e.g. Tauri build).
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "309361418291-0j2jpuk4sdft5hm9tdvpj1n4trukphee.apps.googleusercontent.com",
    NEXT_PUBLIC_IUBENDA_PRIVACY_ID:
      process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_ID || "76778813",
  },
};

export default nextConfig;
