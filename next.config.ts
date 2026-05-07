import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native Chromium + CDP — keep out of the server bundle so binaries resolve at runtime.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
