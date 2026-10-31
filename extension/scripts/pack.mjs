/**
 * Build c3nsor-extension.zip with a single top-level folder so
 * Chrome → Load unpacked always points at the folder that contains manifest.json.
 */
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const stageRoot = join(extDir, ".pack-stage");
const stageDir = join(stageRoot, "c3nsor-extension");
const zipPath = join(extDir, "c3nsor-extension.zip");

const ENTRIES = [
  "manifest.json",
  "background",
  "content",
  "lib",
  "popup",
  "icons",
  "README.md",
];

rmSync(stageRoot, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(stageDir, { recursive: true });

for (const name of ENTRIES) {
  const src = join(extDir, name);
  if (!existsSync(src)) {
    throw new Error(`Missing pack entry: ${name}`);
  }
  cpSync(src, join(stageDir, name), { recursive: true });
}

const popupHtml = join(stageDir, "popup", "popup.html");
if (!existsSync(popupHtml)) {
  throw new Error("Pack verification failed: popup/popup.html missing");
}

execFileSync("zip", ["-r", zipPath, "c3nsor-extension", "-x", "*.DS_Store"], {
  cwd: stageRoot,
  stdio: "inherit",
});

rmSync(stageRoot, { recursive: true, force: true });
console.log(`Packed ${zipPath}`);
