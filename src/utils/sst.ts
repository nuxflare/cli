import { execSync, spawn } from "child_process";
import { getPackageManager, getExecutableCommand } from "./package-manager.js";

/**
 * Executes SST command with the given arguments
 * @param args Array of arguments to pass to the SST command
 * @param options Options for command execution
 * @returns The output from the command
 */
export async function executeSST(
  args: string[],
  options: {
    cwd?: string;
    stdio?: "pipe" | "inherit" | "ignore";
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<string | void> {
  const packageManager = await getPackageManager();
  const executableCmd = getExecutableCommand(packageManager);

  const command = `${executableCmd} sst`;

  try {
    const stdio = options.stdio || "pipe";
    const cwd = options.cwd || process.cwd();
    const env = options.env ? { ...process.env, ...options.env } : process.env;

    if (stdio === "inherit") {
      return new Promise<void>((resolve, reject) => {
        const childProcess = spawn(command, args, {
          stdio,
          cwd,
          env,
          shell: true,
        });

        childProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        childProcess.on("error", (err) => {
          reject(err);
        });
      });
    } else {
      return execSync(`${command} ${args.join(" ")}`, { stdio, cwd, env })
        .toString()
        .trim();
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to execute SST command: ${error.message}`);
    }
    throw error;
  }
}
