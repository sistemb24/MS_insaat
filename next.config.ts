import type { NextConfig } from "next";

export function createSecurityHeaders(isProduction: boolean) {
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

  return headers;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.104"],
  async headers() {
    return [
      {
        headers: createSecurityHeaders(process.env.NODE_ENV === "production"),
        source: "/:path*",
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
