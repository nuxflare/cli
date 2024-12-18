import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { getPackageManager } from "../utils/package-manager";

interface DevOptions {
  stage?: string;
}

export async function dev(options: DevOptions) {
  const env = { ...process.env };

  if (options.stage) {
    const configPath = path.join(
      process.cwd(),
      ".sst/nuxflare",
      `nuxthub_${options.stage}.json`,
    );

    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        env.NUXT_HUB_PROJECT_URL = config.url;
        env.NUXT_HUB_PROJECT_SECRET_KEY = config.secret;
        console.log(
          chalk.blue(`🔗 Connected to Hub (stage: ${options.stage})`),
        );
      } else {
        console.error(
          chalk.red(`❌ No configuration found for stage: ${options.stage}`),
        );
        console.error(
          chalk.yellow(
            `Deploy first using: nuxflare deploy --stage ${options.stage}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error reading Hub configuration:"), error);
      process.exit(1);
    }
  }

  const args = options.stage ? ["dev", "--remote"] : ["dev"];

  if (!options.stage) {
    console.warn(
      chalk.yellow(
        "⚠️  Warning: No stage specified. Running dev without connecting to a remote.",
      ),
    );
  }

  console.log(chalk.blue("🚀 Starting Nuxt development server..."));

  const packageManager = await getPackageManager();

  // Different package managers have different ways to run nuxt
  const command =
    packageManager === "npm"
      ? "npx"
      : packageManager === "yarn"
      ? "yarn"
      : packageManager === "pnpm"
      ? "pnpm"
      : packageManager === "bun"
      ? "bunx"
      : "npx";
  const devProcess = spawn(command, ["nuxt", ...args], {
    stdio: "inherit",
    shell: true,
    env,
  });

  devProcess.on("error", (err) => {
    console.error(chalk.red("❌ Failed to start Nuxt dev server:"), err);
    process.exit(1);
  });
}
