/**
 * Load env before Prisma or app code runs. Order: .env → .env.local → .env.production
 * (later files override). Works for `tsx prisma/seed.ts` without dotenv-cli.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
for (const name of [".env", ".env.local", ".env.production"]) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    config({ path: p, override: true });
  }
}
