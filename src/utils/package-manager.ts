import fs from "fs-extra";

export async function getPackageManager(): Promise<string> {
  try {
    // Detect based on lockfiles
    if (await fs.pathExists("bun.lockb")) return "bun";
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
    yarn: "yarn dlx",
    pnpm: "pnpx",
    bun: "bunx",
  };
  return npxMappings[packageManager] || "npx";
}
