import { readFileSync, existsSync } from "fs";
import { parse } from "dotenv";
import { execSync } from "child_process";
import * as p from "@clack/prompts";
import { log } from "@clack/prompts";
import chalk from "chalk";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager.js";

interface CopyEnvOptions {
  stage?: string;
  production?: boolean;
  file?: string;
}

export async function copyEnv(options: CopyEnvOptions = {}) {
  p.intro("📋Preparing to copy environment variables...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a deployment stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  const envFile = options.file || ".env";
  const deployStage = options.production
    ? "production"
    : (options.stage as string);

  try {
    // Validate .env file exists
    if (!existsSync(envFile)) {
      p.cancel(
        chalk.red(`❌ Environment file ${chalk.bold(envFile)} not found.`),
      );
      process.exit(1);
    }

    // Read and parse .env file
    const envContent = readFileSync(envFile, "utf8");
    const envVars = parse(envContent);

    if (Object.keys(envVars).length === 0) {
      p.cancel(
        chalk.yellow(
          `⚠️ No environment variables found in ${chalk.bold(envFile)}`,
        ),
      );
      process.exit(1);
    }

    // Show preview to user
    log.info("📝 Environment variables to be copied:");
    console.log(JSON.stringify(envVars, null, 2));

    if (deployStage === "production") {
      log.warn(
        "Warning: You are about to update production environment variables.",
      );
      const shouldContinue = await p.confirm({
        message: "Do you want to continue with production environment update?",
      });
      if (!shouldContinue) {
        p.cancel("Operation cancelled");
        process.exit(1);
      }
    }

    const packageManager = await getPackageManager();
    const command = getExecutableCommand(packageManager);

    const s = p.spinner();
    s.start(`Copying environment variables to stage: ${deployStage}`);

    try {
      execSync(
        `${command} sst secret set Env '${JSON.stringify(
          envVars,
        )}' --stage ${deployStage}`,
        {
          stdio: "ignore",
        },
      );

      s.stop(
        `Environment variables successfully copied to ${chalk.bold(
          deployStage,
        )}!`,
      );

      const deployCommand = options.production
        ? "nuxflare deploy --production"
        : `nuxflare deploy --stage ${deployStage}`;
      p.outro(
        `💡 To apply these changes, you need to redeploy your application:\n   ${chalk.blue(
          deployCommand,
        )}`,
      );
    } catch (error) {
      s.stop(`Failed to copy environment variables`);
      throw new Error(
        `Failed to update environment variables: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    log.error(`❌ Operation failed: ${error}`);
    process.exit(1);
  }
}
