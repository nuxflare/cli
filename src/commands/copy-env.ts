import { readFileSync } from "fs";
import { parse } from "dotenv";
import { execSync } from "child_process";
import inquirer from "inquirer";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager";

interface CopyEnvOptions {
  stage: string;
}

export async function copyEnv(options: CopyEnvOptions) {
  try {
    // Read .env file
    const envFile = readFileSync(".env", "utf8");
    const envVars = parse(envFile);

    // Show preview to user
    console.log("\nEnvironment variables to be copied:");
    console.log(JSON.stringify(envVars, null, 2));

    // Ask for confirmation
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Do you want to copy these variables for the stage: ${options.stage}`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log("Operation cancelled");
      return;
    }

    const packageManager = await getPackageManager();
    const command = getExecutableCommand(packageManager);

    // Update SST secrets
    execSync(
      `${command} secret set Env '${JSON.stringify(envVars)}' --stage ${
        options.stage
      }`,
      {
        stdio: "inherit",
      },
    );
    console.log(
      `Environment variables successfully copied to stage ${options.stage}!`,
    );
  } catch (error) {
    console.error("Failed to copy environment variables:", error);
    process.exit(1);
  }
}
