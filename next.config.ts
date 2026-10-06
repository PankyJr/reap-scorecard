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
  // Do not announce the framework in every response.
  poweredByHeader: false,
  // Browser security headers on every response. The CSP only restricts who may
  // frame the app, where forms may post and <base>/<object>; it does not touch
  // scripts or styles, so nothing the app loads is affected.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        ],
      },
    ]
  },
  // Enables forbidden() / unauthorized() for genuine HTTP 403/401 auth interrupts.
  experimental: {
    authInterrupts: true,
  },
  // Never ship these with the server. A file lookup whose path the build cannot
  // predict (the PDF route's Chrome probe) made the trace take the whole
  // project: on a developer machine that swept in the git-ignored tmp/ folder,
  // with staging passwords and real client workbooks, and everywhere it bloated
  // the serverless function. No route reads any of these at run time.
  outputFileTracingExcludes: {
    '**': [
      './tmp/**',
      './artifacts/**',
      './backups/**',
      './client-inputs/**',
      './coverage/**',
      './demo/**',
      './docs/**',
      './scripts/**',
      './src/**',
      './supabase/**',
      './test-fixtures/**',
      './*.md',
      './.env*',
    ],
  },
};

export default nextConfig;
