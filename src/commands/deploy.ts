import { spawn } from "child_process";
import chalk from "chalk";
import { getPackageManager } from "../utils/package-manager";

export async function deploy() {
  console.log(chalk.blue("🚀 Deploying..."));

  const packageManager = await getPackageManager();
  const args = process.argv.slice(3);

  const command =
    packageManager === "npm"
      ? "npx"
      : packageManager === "yarn"
      ? "yarn"
      : packageManager === "pnpm"
      ? "pnpm"
      : packageManager === "bun"
      ? "bunx"
      : "npx";

  const deployProcess = spawn(command, ["sst", "deploy", ...args], {
    stdio: "inherit",
    shell: true,
  });

  return new Promise<void>((resolve, reject) => {
    deployProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green("✅ Deployment complete!"));
        resolve();
      } else {
        console.error(chalk.red("❌ Deployment failed"));
        reject(new Error(`Deploy process exited with code ${code}`));
      }
    });

    deployProcess.on("error", (err) => {
      console.error(chalk.red("❌ Deployment failed:"), err);
      reject(err);
    });
  });
}
