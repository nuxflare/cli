import path from "path";
import { pathExists, readJson } from "./fs.js";

export async function getPackageManager(): Promise<string> {
  try {
    // Try to read from the config.json file
    const configPath = path.join("nuxflare", "config.json");
    if (await pathExists(configPath)) {
      const config = await readJson(configPath);
      if (config.packageManager) {
        return config.packageManager;
      }
    }
    // Fallback to detecting based on lockfiles
    if ((await pathExists("bun.lockb")) || (await pathExists("bun.lock")))
      return "bun";
    if (await pathExists("pnpm-lock.yaml")) return "pnpm";
    if (await pathExists("yarn.lock")) return "yarn";
    return "npm";
  } catch (error) {
    return "npm"; // Default to npm if something goes wrong
  }
}

export function getExecutableCommand(packageManager: string): string {
  const npxMappings: { [key: string]: string } = {
    npm: "npx",
    yarn: "yarn exec",
    pnpm: "pnpm exec",
    bun: "bun x",
  };
  return npxMappings[packageManager] || "npx";
}
