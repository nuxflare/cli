import * as p from "@clack/prompts";
import chalk from "chalk";
import path from "path";
import os from "os";
import { exec } from "child_process";
import terminalLink from "terminal-link";
import { pathExists, ensureDir, writeJson, readJson } from "./fs.js";

const TOKEN_DIR = path.join(os.homedir(), ".nuxflare");
const TOKEN_FILE = path.join(TOKEN_DIR, "token.json");
const CLOUDFLARE_TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
const CREATE_TOKEN_LINK =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22:%22ai%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22vectorize%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22d1%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22workers_r2%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22workers_kv_storage%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22workers_scripts%22,%22type%22:%22edit%22%7D,%7B%22key%22:%22memberships%22,%22type%22:%22read%22%7D,%7B%22key%22:%22user_details%22,%22type%22:%22read%22%7D,%7B%22key%22:%22workers_routes%22,%22type%22:%22edit%22%7D%5D&name=Nuxflare";

/**
 * Executes a Wrangler command to verify the token
 * @param token The Cloudflare API token to verify
 * @returns A promise that resolves to true if the token is valid, false otherwise
 */
async function verifyToken(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const env = { ...process.env, [CLOUDFLARE_TOKEN_ENV]: token };

    exec("npx wrangler whoami", { env }, (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Stores the token in the ~/.nuxflare/token.json file
 * @param token The Cloudflare API token to store
 */
async function storeToken(token: string): Promise<void> {
  await ensureDir(TOKEN_DIR);
  await writeJson(TOKEN_FILE, { token }, { spaces: 2 });
}

/**
 * Gets the Cloudflare API token from environment variables or stored file
 * @returns The Cloudflare API token if found
 */
async function getExistingToken(): Promise<string | null> {
  // Check environment variable first
  if (process.env[CLOUDFLARE_TOKEN_ENV]) {
    return process.env[CLOUDFLARE_TOKEN_ENV];
  }

  // Check stored file
  try {
    if (await pathExists(TOKEN_FILE)) {
      const data = await readJson(TOKEN_FILE);
      return data.token;
    }
  } catch (error) {
    // File might be corrupted, continue to prompt
  }

  return null;
}

/**
 * Gets a valid Cloudflare API token, prompting the user if necessary
 * @returns A promise that resolves to the Cloudflare API token
 * @throws Error if the user cancels the interaction
 */
export async function getCloudflareToken(): Promise<string> {
  // Try to get existing token
  let token = await getExistingToken();

  // If we have a token, verify it
  if (token) {
    const isValid = await verifyToken(token);
    if (isValid) {
      return token;
    }
  }

  // Token doesn't exist or is invalid, prompt user
  p.intro(chalk.blue("🔑 Cloudflare API Token Required"));

  p.log.info(
    [
      "You need to create a Cloudflare API Token.",
      `You can create one by clicking ${chalk.cyan(
        terminalLink("on this link", CREATE_TOKEN_LINK),
      )}.`,
    ].join("\n"),
  );

  let tokenValid = false;
  while (!tokenValid) {
    const input = await p.password({
      message: "Enter your Cloudflare API Token:",
      validate: (value) => {
        if (!value.trim()) return "Token is required";
        return;
      },
    });

    // Check if user cancelled
    if (p.isCancel(input)) {
      p.cancel("Token input cancelled");
      throw new Error("Cloudflare API Token is required but was not provided");
    }
    token = input;

    // Verify the token
    p.log.info("Verifying token...");
    tokenValid = await verifyToken(input);

    if (!tokenValid) {
      p.log.error("Invalid token. Please try again.");
    }
  }

  // Token is valid, ask if we should store it
  p.log.success("Token verified successfully!");

  const shouldStoreToken = await p.confirm({
    message:
      "Would you like to store this token for future use on this device?",
    initialValue: true,
  });

  // Check if user cancelled
  if (p.isCancel(shouldStoreToken)) {
    p.log.warn(
      "Token will not be stored, but will be used for the current session.",
    );
  } else if (shouldStoreToken) {
    await storeToken(token as string);
    p.log.success(`Token stored in ${TOKEN_FILE}`);
  }
  return token as string;
}
