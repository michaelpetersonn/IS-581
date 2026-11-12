#!/usr/bin/env node
/**
 * Minimal static server for local preview and the Playwright tests.
 * Serves docs/ at / and tests/e2e/fixtures/ at /fixtures/. No dependencies.
 * node scripts/serve-docs.mjs [port]   (default 8765)
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const MOUNTS = [
  ["/fixtures/", join(root, "tests", "e2e", "fixtures")],
  ["/", join(root, "docs")],
];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
};

/** @param {string} pathname */
function resolveFile(pathname) {
  for (const [prefix, dir] of MOUNTS) {
    if (!pathname.startsWith(prefix)) continue;
    const rel = normalize(decodeURIComponent(pathname.slice(prefix.length)));
    const file = join(dir, rel);
    if (file !== dir && !file.startsWith(dir + sep)) return null;
    try {
      const stat = statSync(file);
      if (stat.isDirectory()) {
        const index = join(file, "index.html");
        return statSync(index).isFile() ? index : null;
      }
      return stat.isFile() ? file : null;
    } catch {
      return null;
    }
  }
  return null;
}

const port = Number(process.argv[2] || process.env.PORT || 8765);
createServer((req, res) => {
  const { pathname } = new URL(req.url || "/", "http://localhost");
  const file = resolveFile(pathname);
  if (!file || (req.method !== "GET" && req.method !== "HEAD")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving docs/ and test fixtures at http://localhost:${port}/`);
});
