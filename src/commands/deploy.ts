import { spawn } from "child_process";
import chalk from "chalk";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager";

export async function deploy() {
  console.log(chalk.blue("🚀 Deploying..."));

  const packageManager = await getPackageManager();
  const command = getExecutableCommand(packageManager);
  const args = ["sst", "deploy", ...process.argv.slice(3)];

  const deployProcess = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NITRO_PRESET: "cloudflare-module" },
  });

  return new Promise<void>((resolve, reject) => {
    deployProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deploy process exited with code ${code}`));
      }
    });

    deployProcess.on("error", (err) => {
      reject(err);
    });
  });
}
