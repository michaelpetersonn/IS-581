/**
 * Prepare the GitHub Pages site: copy the analyzer engine for the web demo and build the zip download.
 * Run: node scripts/build-web.mjs   (also runs in the Pages deploy workflow)
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(extDir, "..", "docs");

/** Browser-safe modules only (no chrome.* APIs); must include every relative import they use. */
const ENGINE_FILES = ["clean.js", "rules.js", "summarize.js", "templates.js", "result.js"];

const engineDir = join(docsDir, "try", "engine");
rmSync(engineDir, { recursive: true, force: true });
mkdirSync(engineDir, { recursive: true });
for (const file of ENGINE_FILES) {
  cpSync(join(extDir, "lib", file), join(engineDir, file));
}
console.log(`Copied ${ENGINE_FILES.length} engine files → docs/try/engine/`);

execFileSync("npm", ["run", "--silent", "pack"], { cwd: extDir, stdio: "inherit" });
const downloadsDir = join(docsDir, "downloads");
mkdirSync(downloadsDir, { recursive: true });
cpSync(join(extDir, "c3nsor-extension.zip"), join(downloadsDir, "c3nsor-extension.zip"));
console.log("Copied extension zip → docs/downloads/c3nsor-extension.zip");
