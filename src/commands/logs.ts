import chalk from "chalk";
import { log } from "@clack/prompts";
import * as p from "@clack/prompts";
import path from "path";
import { readdir } from "fs/promises";
import { exec } from "child_process";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager.js";

interface LogsOptions {
  stage?: string;
  production?: boolean;
}

export async function logs(options: LogsOptions = {}) {
  p.intro("📋 Fetching logs from deployment...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  const logsStage = options.production
    ? "production"
    : (options.stage as string);

  if (options.stage === "production" || options.production) {
    log.warn("Warning: You're viewing logs for the production environment.");
  }

  try {
    log.step(`Getting logs for stage: ${logsStage}`);
    const stateDir = path.join(".nuxflare", "state", logsStage);

    // Find the app directory
    const apps = await readdir(stateDir);
    const app = apps[0];
    if (!app) {
      throw new Error("No apps found in stage");
    }

    // Find the wrangler config file
    const wranglerConfigPath = path.join(stateDir, app, "wrangler.json");

    // Get the package manager to determine how to run wrangler
    const packageManager = await getPackageManager();
    const execCommand = getExecutableCommand(packageManager);

    log.info(
      `Starting logs stream for ${chalk.bold(app)} (${chalk.blue(
        logsStage,
      )} stage)`,
    );
    log.info(`You can press ${chalk.bold("Ctrl+C")} to stop watching logs`);

    // Construct the full command
    const fullCommand = `${execCommand} wrangler tail --format pretty --config ${wranglerConfigPath}`;

    // Execute wrangler tail command using exec
    return new Promise<void>((resolve, reject) => {
      const childProcess = exec(fullCommand);

      // Pipe stdout and stderr to the parent process
      childProcess.stdout?.pipe(process.stdout);
      childProcess.stderr?.pipe(process.stderr);

      // Handle process completion
      childProcess.on("error", (error) => {
        reject(error);
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      // Handle SIGINT (Ctrl+C) to properly clean up
      process.on("SIGINT", () => {
        childProcess.kill();
        resolve();
      });
    });
  } catch (error) {
    log.error(`❌ Failed to fetch logs: ${error}`);
    process.exit(1);
  }
}
