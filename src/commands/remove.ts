import { spawn } from "child_process";
import chalk from "chalk";
import { getPackageManager } from "../utils/package-manager";

export async function remove() {
  console.log(chalk.blue("Removing..."));

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

  const removeProcess = spawn(command, ["sst", "remove", ...args], {
    stdio: "inherit",
    shell: true,
  });

  return new Promise<void>((resolve, reject) => {
    removeProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green("✅ Removed!"));
        resolve();
      } else {
        console.error(chalk.red("❌ Removal failed"));
        reject(new Error(`Deploy process exited with code ${code}`));
      }
    });

    removeProcess.on("error", (err) => {
      console.error(chalk.red("❌ Removal failed:"), err);
      reject(err);
    });
  });
}
