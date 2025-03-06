import chalk from "chalk";
import { log } from "@clack/prompts";
import * as p from "@clack/prompts";
import { spawn } from "child_process";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager.js";
import { getProjectConfig } from "../utils/project-config.js";

interface DevOptions {
  stage?: string;
  production?: boolean;
}

export async function dev(options: DevOptions = {}) {
  p.intro("🚀 Starting development server...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  const devStage = options.production
    ? "production"
    : (options.stage as string);

  if (options.stage === "production") {
    log.warn(
      "Warning: Development against production environment is not recommended.",
    );
    const shouldContinue = await p.confirm({
      message: "Do you want to continue?",
    });
    if (!shouldContinue) {
      p.cancel("Development cancelled");
      process.exit(1);
    }
  }

  try {
    log.step(`Connecting to stage: ${devStage}`);
    const config = await getProjectConfig(devStage);

    const env = {
      ...process.env,
      NUXT_HUB_PROJECT_URL: config.url,
      NUXT_HUB_PROJECT_SECRET_KEY: config.secret,
    };

    const packageManager = await getPackageManager();
    const command = getExecutableCommand(packageManager);

    log.info(`Connected to ${devStage} (${chalk.blue(config.url)})`);
    log.step("Starting Nuxt development server...");

    const devProcess = spawn(command, ["nuxt", "dev", "--remote"], {
      stdio: "inherit",
      shell: true,
      env,
    });

    devProcess.on("error", (err) => {
      throw new Error(`Failed to start Nuxt dev server: ${err}`);
    });
  } catch (error) {
    log.error(`❌ Failed to start development server: ${error}`);
    process.exit(1);
  }
}
