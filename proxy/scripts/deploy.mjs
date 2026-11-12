#!/usr/bin/env node
/**
 * Deploy the policy proxy with its commit stamped in, then smoke-check it.
 *
 *   npm run deploy:staging   → c3nsor-policy-proxy-staging
 *   npm run deploy           → c3nsor-policy-proxy (production)
 *
 * Refuses to deploy uncommitted changes, and production only deploys an up-to-date main,
 * so /health always names a commit that exists on GitHub.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const proxyDir = join(fileURLToPath(import.meta.url), "..", "..");
const repoRoot = join(proxyDir, "..");

export const TARGETS = {
  production: {
    wranglerArgs: [],
    url: "https://c3nsor-policy-proxy.petersonmichaelc.workers.dev",
  },
  staging: {
    wranglerArgs: ["--env", "staging"],
    url: "https://c3nsor-policy-proxy-staging.petersonmichaelc.workers.dev",
  },
};

/**
 * @param {{ env: string, status: string, branch: string, head: string, remoteHead: string|null }} state
 * @returns {string[]} reasons the deploy must not run (empty when it may)
 */
export function deployBlockers(state) {
  const problems = [];
  if (!(state.env in TARGETS)) {
    problems.push(
      `Unknown environment "${state.env}" (use staging or production).`,
    );
  }
  if (state.status.trim()) {
    problems.push("There are uncommitted changes. Commit or stash them first.");
  }
  if (state.env === "production") {
    if (state.branch !== "main") {
      problems.push(
        `Production deploys run from main (you are on ${state.branch}).`,
      );
    } else if (!state.remoteHead || state.head !== state.remoteHead) {
      problems.push(
        "Local main does not match origin/main. Pull or push first.",
      );
    }
  }
  return problems;
}

/** @param {string[]} argv */
function parseEnv(argv) {
  const i = argv.indexOf("--env");
  return i >= 0 ? argv[i + 1] : "production";
}

const git = (...args) =>
  execFileSync("git", args, { cwd: repoRoot }).toString().trim();

function main() {
  const env = parseEnv(process.argv.slice(2));
  if (env === "production") {
    spawnSync("git", ["fetch", "--quiet", "origin", "main"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
  let remoteHead = null;
  try {
    remoteHead = git("rev-parse", "origin/main");
  } catch {
    /* no remote ref */
  }
  const blockers = deployBlockers({
    env,
    status: git("status", "--porcelain"),
    branch: git("rev-parse", "--abbrev-ref", "HEAD"),
    head: git("rev-parse", "HEAD"),
    remoteHead,
  });
  if (blockers.length) {
    for (const reason of blockers) console.error(`✗ ${reason}`);
    process.exit(1);
  }

  const version = git("rev-parse", "--short=7", "HEAD");
  const target = TARGETS[env];
  console.log(`Deploying ${version} to ${env} (${target.url})`);
  const deploy = spawnSync(
    "npx",
    [
      "wrangler",
      "deploy",
      ...target.wranglerArgs,
      "--var",
      `VERSION:${version}`,
    ],
    { cwd: proxyDir, stdio: "inherit" },
  );
  if (deploy.status !== 0) process.exit(deploy.status ?? 1);

  console.log(`Smoke-checking ${env}…`);
  const smoke = spawnSync(
    process.execPath,
    [
      join(repoRoot, "scripts", "monitor.mjs"),
      "--proxy-only",
      "--proxy-url",
      target.url,
      "--expect-proxy-version",
      version,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (smoke.status !== 0) {
    console.error(
      `✗ ${env} is deployed but failed its smoke check. Roll back with: cd proxy && npx wrangler rollback${env === "staging" ? " --env staging" : ""}`,
    );
    process.exit(smoke.status ?? 1);
  }
  console.log(`✓ ${env} is running ${version}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
