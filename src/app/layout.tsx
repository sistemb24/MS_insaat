import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { getPublicSiteConfig } from "@/lib/marketing/public-site-config";

import "./globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
});

const publicSiteConfig = getPublicSiteConfig();

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteConfig.origin),
  title: "NOA İnşaat Yönetim SaaS",
  description:
    "Tenant kapsamlı inşaat operasyonu, finans ve saha yönetimi web uygulaması.",
  robots: publicSiteConfig.indexingEnabled
    ? { follow: true, index: true }
    : { follow: false, index: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

