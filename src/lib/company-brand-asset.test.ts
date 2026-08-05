import { describe, expect, test } from "vitest";
import { COMPANY_LOGO_MAX_BYTES, validateCompanyLogo } from "./company-brand-asset";

function png(width = 128, height = 64) {
  const bytes = new Uint8Array(24);
  bytes.set([137,80,78,71,13,10,26,10], 0);
  bytes.set([73,72,68,82], 12);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

describe("company brand asset domain", () => {
  test("accepts a bounded PNG and sanitizes its file name", () => {
    expect(validateCompanyLogo({ content: png(), mimeType: "image/png", originalFileName: "../logo.png" })).toMatchObject({ height: 64, originalFileName: "logo.png", width: 128 });
  });
  test("rejects MIME, signature, dimensions, ratio and size violations", () => {
    expect(() => validateCompanyLogo({ content: png(), mimeType: "image/svg+xml", originalFileName: "x.svg" })).toThrow();
    expect(() => validateCompanyLogo({ content: new Uint8Array(24), mimeType: "image/png", originalFileName: "x.png" })).toThrow();
    expect(() => validateCompanyLogo({ content: png(32, 32), mimeType: "image/png", originalFileName: "x.png" })).toThrow();
    expect(() => validateCompanyLogo({ content: png(512, 64), mimeType: "image/png", originalFileName: "x.png" })).toThrow();
    expect(() => validateCompanyLogo({ content: new Uint8Array(COMPANY_LOGO_MAX_BYTES + 1), mimeType: "image/png", originalFileName: "x.png" })).toThrow();
  });
});
