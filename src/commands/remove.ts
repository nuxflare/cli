import chalk from "chalk";
import * as p from "@clack/prompts";
import { log } from "@clack/prompts";
import { executeSST } from "../utils/sst.js";

interface RemoveOptions {
  stage?: string;
  production?: boolean;
}

export async function remove(options: RemoveOptions = {}) {
  log.info("🗑️  Removing resources...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  try {
    const removeStage = options.production
      ? "production"
      : (options.stage as string);

    // Extra warning for production removals
    if (removeStage === "production") {
      log.warn(
        chalk.yellow(
          "⚠️  WARNING: You are about to remove PRODUCTION resources!",
        ),
      );
      const shouldContinue = await p.confirm({
        message: "Are you absolutely sure you want to remove production resources?",
      });
      if (!shouldContinue) {
        p.cancel("Operation cancelled");
        process.exit(1);
      }
    } else {
      // For non-production stages, still confirm but with less dramatic warning
      const shouldContinue = await p.confirm({
        message: `Are you sure you want to remove resources from the "${removeStage}" stage?`,
      });
      if (!shouldContinue) {
        p.cancel("Operation cancelled");
        process.exit(1);
      }
    }

    log.step(`Removing resources from stage: ${removeStage}`);

    try {
      await executeSST(["remove", "--stage", removeStage], {
        stdio: "inherit",
      });
      log.success(`✅ Successfully removed resources from ${removeStage}!`);
    } catch (error) {
      throw new Error(
        `Removal failed: ${error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    log.error(`❌ Removal failed: ${error}`);
    process.exit(1);
  }
}
