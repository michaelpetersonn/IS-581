#!/usr/bin/env node
/**
 * Write docs/version.json during the Pages deploy so anyone can see exactly what is live:
 * https://michael-peterson.com/IS-581/version.json
 * Uses GITHUB_SHA in CI and the local HEAD otherwise. The file is generated and gitignored.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * @param {{ commit: string, extensionVersion: string, builtAt: string, runUrl?: string|null }} info
 */
export function versionDocument(info) {
  if (!/^[0-9a-f]{7,40}$/.test(info.commit)) {
    throw new Error(`Not a commit SHA: ${info.commit}`);
  }
  return {
    commit: info.commit,
    shortCommit: info.commit.slice(0, 7),
    extensionVersion: info.extensionVersion,
    builtAt: info.builtAt,
    ...(info.runUrl ? { deployRun: info.runUrl } : {}),
  };
}

function main() {
  const { GITHUB_SHA, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } =
    process.env;
  const commit =
    GITHUB_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
  const manifest = JSON.parse(
    readFileSync(join(root, "extension", "manifest.json"), "utf8"),
  );
  const doc = versionDocument({
    commit,
    extensionVersion: manifest.version,
    builtAt: new Date().toISOString(),
    runUrl:
      GITHUB_RUN_ID && GITHUB_REPOSITORY
        ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
        : null,
  });
  writeFileSync(
    join(root, "docs", "version.json"),
    `${JSON.stringify(doc, null, 2)}\n`,
  );
  console.log(`Wrote docs/version.json for ${doc.shortCommit}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
