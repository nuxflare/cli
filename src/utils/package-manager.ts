import fs from "fs-extra";
import path from "path";

export async function getPackageManager(): Promise<string> {
  try {
    // Try to read from the config.json file
    const configPath = path.join(".nuxflare", "state", "config.json");
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      if (config.packageManager) {
        return config.packageManager;
      }
    }

    // Fallback to detecting based on lockfiles
    if ((await fs.pathExists("bun.lockb")) || (await fs.pathExists("bun.lock")))
      return "bun";
    if (await fs.pathExists("pnpm-lock.yaml")) return "pnpm";
    if (await fs.pathExists("yarn.lock")) return "yarn";
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
