import chalk from "chalk";
import * as p from "@clack/prompts";
import { log } from "@clack/prompts";
import { getCloudflareToken } from "../utils/cloudflare-token.js";
import { executeSST } from "../utils/sst.js";
import * as fs from "fs-extra";
import * as path from "path";

interface DeployOptions {
  stage?: string;
  production?: boolean;
  force?: boolean;
}

async function displayProjectUrls(stage: string) {
  const stateDir = path.join(".nuxflare", "state", stage);

  try {
    const apps = await fs.readdir(stateDir);

    let foundUrls = false;

    for (const app of apps) {
      const stateFilePath = path.join(stateDir, app, "state.json");

      try {
        if (await fs.pathExists(stateFilePath)) {
          const stateData = await fs.readJson(stateFilePath);
          if (stateData.projectUrl) {
            if (!foundUrls) {
              log.info("📍 Deployed URLs:");
              foundUrls = true;
            }
            log.info(`${chalk.bold(app)}: ${chalk.blue(stateData.projectUrl)}`);
          }
        }
      } catch (error) {
        // Skip invalid state files
        continue;
      }
    }
  } catch (error) {
    console.log("error project uurls", error)
    // If there's an error reading the directory, just skip URL display
    console.error("Unable to read deployment URLs");
  }
}

export async function deploy(options: DeployOptions = {}) {
  log.info("🚀 Deploying...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a deployment stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  try {
    const token = await getCloudflareToken();
    if (!token) {
      p.cancel(
        chalk.red("❌ Cloudflare API token not found. Deployment aborted."),
      );
      process.exit(1);
    }

    const deployStage = options.production
      ? "production"
      : (options.stage as string);
    if (options.stage === "production") {
      // Show warning if stage name is "production"
      log.warn(
        "Warning: 'production' should not be used as a development stage name. " +
        "Use --production flag for production deployments.",
      );
      if (!options.force) {
        const shouldContinue = await p.confirm({
          message: "Do you want to do a production deployment?",
        });
        if (!shouldContinue) {
          p.cancel("Deployment cancelled");
          process.exit(1);
        }
      }
    }

    log.step(`Deploying to stage: ${deployStage}`);

    try {
      await executeSST(["deploy", "--stage", deployStage, "--verbose"], {
        stdio: "inherit",
        env: {
          NITRO_PRESET: "cloudflare-module",
          CLOUDFLARE_API_TOKEN: token,
        },
      });
      log.success(`✅ Successfully deployed to ${deployStage}!`);

      // Display URLs after successful deployment
      await displayProjectUrls(deployStage);
    } catch (error) {
      throw new Error(
        `Deployment failed: ${error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    log.error(`❌ Deployment failed: ${error}`);
    process.exit(1);
  }
}
