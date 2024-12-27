import { spawn } from "child_process";
import chalk from "chalk";
import { getExecutableCommand } from "../utils/package-manager";

export async function deploy() {
  console.log(chalk.blue("🚀 Deploying..."));

  const command = await getExecutableCommand("sst");
  const args = ["deploy", ...process.argv.slice(3)];

  const deployProcess = spawn(command, args, {
    stdio: "inherit",
    shell: true,
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
