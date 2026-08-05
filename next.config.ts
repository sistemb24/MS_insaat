import type { NextConfig } from "next";

import { getPublicSiteConfig } from "./src/lib/marketing/public-site-config";

export function createSecurityHeaders(
  isProduction: boolean,
  indexingEnabled = false,
) {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];

  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:", "wss:");
  }

  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  if (!indexingEnabled) {
    headers.push({
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.104"],
  async headers() {
    const publicSiteConfig = getPublicSiteConfig(process.env);

    return [
      {
        headers: createSecurityHeaders(
          process.env.NODE_ENV === "production",
          publicSiteConfig.indexingEnabled,
        ),
        source: "/:path*",
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
