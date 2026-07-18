import type { Metadata } from "next";
import "./globals.css";


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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

