import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const patterns = [
  { label: "private-key", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { label: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { label: "openai-key", pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { label: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
] as const;
const textExtensions = new Set([
  ".css", ".env", ".html", ".js", ".json", ".md", ".mjs", ".prisma",
  ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean)
  .filter((file) => textExtensions.has(extname(file).toLowerCase()));

const findings: Array<{ file: string; label: string; line: number }> = [];

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  content.split(/\r?\n/).forEach((line, index) => {
    for (const { label, pattern } of patterns) {
      if (pattern.test(line)) findings.push({ file, label, line: index + 1 });
    }
  });
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.label}]`);
  }
  throw new Error(`${findings.length} yüksek güvenli secret adayı bulundu.`);
}

console.log(JSON.stringify({ filesScanned: files.length, highConfidenceFindings: 0 }));
