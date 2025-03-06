import chalk from "chalk";
import { log } from "@clack/prompts";
import * as p from "@clack/prompts";
import open from "open";
import { getProjectConfig } from "../utils/project-config.js";

interface OpenOptions {
  stage?: string;
  production?: boolean;
}

export async function openProject(options: OpenOptions = {}) {
  p.intro("🌐 Opening project in browser...");

  if (!options.stage && !options.production) {
    p.cancel(
      "Please specify a stage with the --stage flag or the --production flag.",
    );
    process.exit(1);
  }

  const openStage = options.production
    ? "production"
    : (options.stage as string);

  if (options.stage === "production") {
    log.warn("Warning: You're opening the production environment.");
  }

  try {
    log.step(`Getting URL for stage: ${openStage}`);
    const config = await getProjectConfig(openStage);

    log.info(`Opening ${openStage} (${chalk.blue(config.url)})`);

    // Open the URL in the default browser
    await open(config.url);
    log.success(`Successfully opened ${openStage} project URL in your browser`);
  } catch (error) {
    log.error(`❌ Failed to open project URL: ${error}`);
    process.exit(1);
  }
}
