export async function getPackageManager() {
  try {
    return (await import("./config.json"))
      .packageManager as keyof typeof PACKAGE_MANAGER_COMMANDS;
  } catch {}
  return "npm";
}

export const PACKAGE_MANAGER_COMMANDS = {
  pnpm: "pnpm exec",
  yarn: "yarn exec",
  npm: "npx",
  bun: "bun x",
} as const;
