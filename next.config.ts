import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prefer minimal runtime artifact for cPanel Passenger deployments.
  output: 'standalone',
  // Native Chromium + CDP — keep out of the server bundle so binaries resolve at runtime.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Shared hosting often struggles with dynamic image optimization.
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
  },
  // Enables forbidden() / unauthorized() for genuine HTTP 403/401 auth interrupts.
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
