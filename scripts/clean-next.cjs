#!/usr/bin/env node
/**
 * Remove .next and webpack cache.
 * On macOS, plain `rm -rf` sometimes hits EPERM on generated types — we chmod first, then rm.
 * If it still fails: stop `next dev`, close extra IDE windows, then run again or delete `.next` in Finder.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");

function nodeRm(target) {
  if (!fs.existsSync(target)) return;
  fs.chmodSync(target, 0o755);
  fs.rmSync(target, { recursive: true, force: true });
}

try {
  if (process.platform !== "win32") {
    const isMac = process.platform === "darwin";
    const prelude = isMac
      ? "find .next -name .DS_Store -delete 2>/dev/null; chflags -R nouchg .next 2>/dev/null; "
      : "";
    execSync(
      `${prelude}chmod -R u+w .next node_modules/.cache 2>/dev/null; rm -rf .next node_modules/.cache`,
      {
        cwd: root,
        stdio: "inherit",
        shell: "/bin/sh",
        env: process.env,
      }
    );
  } else {
    nodeRm(path.join(root, ".next"));
    nodeRm(path.join(root, "node_modules", ".cache"));
  }
  console.log("[clean] done.");
} catch (e) {
  console.error(
    "\n[clean] Failed. Try:\n" +
      "  1. Stop `next dev` and any `next` / `node` processes\n" +
      "  2. Run:  chmod -R u+w .next && rm -rf .next node_modules/.cache\n" +
      "  3. Or delete the `.next` folder in Finder\n"
  );
  process.exit(1);
}
