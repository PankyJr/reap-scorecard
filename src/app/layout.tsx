import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_SITE_DESCRIPTION, getSiteUrl, SITE_NAME } from "@/lib/seo/site";
import { DemoDataBanner } from "@/components/layout/DemoDataBanner";
import { isDemoInstance } from "@/lib/demo/demoMode";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} | B-BBEE Advisory & REAP Scorecard`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  // The demonstration deployment must never be indexed: its supplier data is
  // fabricated and must not surface in a search result where someone could
  // mistake it for real client information. `noindex` is the control that
  // actually removes a URL from an index once it has been linked to — a
  // robots.txt disallow only asks crawlers not to fetch it.
  robots: isDemoInstance()
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
      }
    : {
        index: true,
        follow: true,
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={isDemoInstance() ? "demo-instance" : undefined}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DemoDataBanner />
        {children}
      </body>
    </html>
  );
}
