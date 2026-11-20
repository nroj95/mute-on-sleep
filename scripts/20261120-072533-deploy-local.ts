// =====================================================================================================
// scripts/20261120-072533-deploy-local.ts — build and install this checkout into the local Decky
// =====================================================================================================
// Personal helper for nroj95's MuteOnSleep fork on the Legion Go S (SteamOS). Not part of upstream.
// Run it ON the Go S, in a terminal:   node ~/dev/mute-on-sleep/scripts/20261120-072533-deploy-local.ts
//
// What it does, in order:
//   1. `pnpm run build` (frontend → dist/index.js).
//   2. Copies the runtime files (plugin.json, package.json, main.py, LICENSE, README.md, dist/) over the
//      store install in ~/homebrew/plugins/MuteOnSleep with `sudo rsync` (--delete inside dist/ keeps it
//      an exact copy). sudo: Decky keeps the plugin folder and plugin.json root-owned; it asks for the
//      deck password once.
//   3. Restarts Decky (`sudo systemctl restart plugin_loader`); Decky doesn't live-reload. Skip with
//      --no-restart.
// Settings (~/homebrew/settings/MuteOnSleep/settings.json) are kept.
//
// Requirements: Node 23.6+ (TypeScript stripping) and pnpm in PATH (~/.local/bin), rsync, sudo.
// Undo: the store install is backed up in ~/dev/mute-on-sleep-installed-1.0.1 — copy it back with
//   sudo rsync -a --delete ~/dev/mute-on-sleep-installed-1.0.1/ ~/homebrew/plugins/MuteOnSleep/
// =====================================================================================================

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(homedir(), "homebrew", "plugins", "MuteOnSleep");
const RUNTIME_FILES = ["plugin.json", "package.json", "main.py", "LICENSE", "README.md", "dist"];

const run = (cmd: string, args: string[]) => {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  try { execFileSync(cmd, args, { cwd: REPO, stdio: "inherit" }); }
  catch { console.error(`✗ ${cmd} failed`); process.exit(1); }
};

run("pnpm", ["run", "build"]);
run("sudo", ["rsync", "-a", "--delete", "--exclude", "__pycache__", ...RUNTIME_FILES, `${TARGET}/`]);

if (process.argv.includes("--no-restart")) {
  console.log("✓ Copied. Restart Decky yourself: sudo systemctl restart plugin_loader");
} else {
  run("sudo", ["systemctl", "restart", "plugin_loader"]);
  console.log("✓ Deployed. Log: ~/homebrew/logs/MuteOnSleep/");
}
