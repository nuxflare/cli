import chalk from "chalk";
import { log } from "@clack/prompts";
import { readdir, readFile } from "fs/promises";
import path from "path";

export interface ProjectConfig {
  url: string;
  secret: string;
}

export async function getProjectConfig(stage: string): Promise<ProjectConfig> {
  const stateDir = path.join(".nuxflare", "state", stage);
  try {
    const apps = await readdir(stateDir);
    const app = apps[0];
    if (!app) {
      throw new Error("No apps found in stage");
    }
    const stateFilePath = path.join(stateDir, app, "state.json");
    const file = await readFile(stateFilePath);
    const stateData = JSON.parse(file.toString());
    if (stateData.projectUrl && stateData.nuxtHubSecret) {
      return {
        url: stateData.projectUrl,
        secret: stateData.nuxtHubSecret,
      };
    }
    throw new Error("Invalid state file");
  } catch (error) {
    throw new Error(`Failed to read project configuration: ${error}`);
  }
}

export async function displayProjectUrls(stage: string): Promise<void> {
  const stateDir = path.join(".nuxflare", "state", stage);
  try {
    const apps = await readdir(stateDir);
    let foundUrls = false;
    for (const app of apps) {
      const stateFilePath = path.join(stateDir, app, "state.json");
      try {
        const file = await readFile(stateFilePath);
        const stateData = JSON.parse(file.toString());
        if (stateData.projectUrl) {
          if (!foundUrls) {
            log.info("📍 Deployed URLs:");
            foundUrls = true;
          }
          log.info(`${chalk.bold(app)}: ${chalk.blue(stateData.projectUrl)}`);
        }
      } catch (error) {
        // Skip invalid state files
        continue;
      }
    }
  } catch (error) {
    log.error("Unable to read deployment URLs.");
  }
}
