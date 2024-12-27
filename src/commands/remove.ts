import { spawn } from "child_process";
import chalk from "chalk";
import {
  getPackageManager,
  getExecutableCommand,
} from "../utils/package-manager";

export async function remove() {
  console.log(chalk.blue("Removing..."));

  const packageManager = await getPackageManager();
  const command = getExecutableCommand(packageManager);
  const args = ["remove", ...process.argv.slice(3)];

  const removeProcess = spawn(command, args, {
    stdio: "inherit",
    shell: true,
  });

  return new Promise<void>((resolve, reject) => {
    removeProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deploy process exited with code ${code}`));
      }
    });

    removeProcess.on("error", (err) => {
      console.error(chalk.red("❌ Removal failed:"), err);
      reject(err);
    });
  });
}
