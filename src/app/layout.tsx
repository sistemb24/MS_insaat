import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

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

export const metadata: Metadata = {
  title: "NOA İnşaat Yönetim SaaS",
  description: "NOA İnşaat ön muhasebe SaaS kabuk ve P0 modül iskeleti",
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

