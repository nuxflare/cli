import * as p from "@clack/prompts";
import { log } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { Liquid } from 'liquidjs'

import { rootPath } from "../utils/dirname.js";

// Helper function to run commands
function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = "\n";
    const childProcess = exec(command);
    childProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });
    childProcess.stderr?.on("data", (data) => {
      output += data.toString();
    });
    childProcess.on("close", (code) => {
      console.log(output);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

export async function init() {
  try {
    // Show welcome message
    p.intro(chalk.blue("👋 Welcome to Nuxflare Setup!"));
    log.message(
      "Let's get your Nuxt.js project ready for Cloudflare deployment.",
      { symbol: chalk.blue("ℹ") },
    );

    // Check if nuxt.config exists (async)
    const configFiles = ["nuxt.config.ts", "nuxt.config.js"];
    const configExists = await Promise.all(
      configFiles.map(file => fs.pathExists(file))
    ).then(results => results.reduce((acc, exists) => acc || exists, false));

    if (!configExists) {
      p.cancel(
        chalk.red(
          "❌ No nuxt.config file found. Please run this command in a Nuxt project.",
        ),
      );
      process.exit(1);
    }

    const results = await p.group(
      {
        projectName: () =>
          p.text({
            message: "What is your project name?",
            initialValue: path.basename(process.cwd()),
          }),
        packageManager: () =>
          p.select({
            message: "Which package manager do you use?",
            options: [
              { value: "npm", label: "npm" },
              { value: "pnpm", label: "pnpm" },
              { value: "bun", label: "bun" },
              { value: "yarn", label: "yarn" },
            ],
            initialValue: "npm",
          }),
        prodDomain: () =>
          p.text({
            message:
              "What is your production domain? (Leave empty to use automatic Cloudflare Workers subdomain)",
            placeholder:
              "e.g., app.example.com (domain must be registered on Cloudflare)",
          }),
        devDomain: () =>
          p.text({
            message:
              "What is your development domain for preview deployments? (Leave empty to use automatic Cloudflare Workers subdomain)",
            placeholder:
              "e.g., dev.example.codes (stages like 'dev' will deploy to 'dev.dev.example.codes')",
          }),
        githubActions: () =>
          p.select({
            message: "How would you like to setup GitHub Actions?",
            options: [
              { value: "none", label: "Don't setup GitHub Actions" },
              { value: "manual", label: "Manual deployments only (via workflow dispatch)" },
              { value: "prod", label: "Automatic production deployments only (main branch)" },
              { value: "full", label: "Full setup (automatic prod and preview deployments for PRs)" },
            ],
            initialValue: "none",
          }),
      },
      {
        onCancel: () => {
          p.cancel("Setup cancelled");
          process.exit(1);
        },
      },
    );

    // Initialize variables for task context
    const initDir = path.resolve(rootPath, "init");
    const templateDir = path.resolve(initDir, "sst");
    const targetDir = path.resolve(process.cwd());

    await p.tasks([
      {
        title: "Copying project files",
        task: async () => {
          await fs.copy(templateDir, targetDir, {
            overwrite: true,
          });
          return "Project files copied successfully";
        },
      },
      {
        title: "Configuring project",
        task: async () => {
          // Process sst.config.ts
          const sstConfigPath = path.join(targetDir, "sst.config.ts");
          let sstConfig = await fs.readFile(sstConfigPath, "utf8");

          sstConfig = sstConfig
            .replace("__PROJECT_NAME__", results.projectName)
            .replace("__PACKAGE_MANAGER__", results.packageManager);

          if (results.prodDomain) {
            sstConfig = sstConfig.replace(
              '"__PROD_DOMAIN__"',
              `"${results.prodDomain}"`,
            );
          } else {
            sstConfig = sstConfig.replace('"__PROD_DOMAIN__"', "undefined");
          }
          if (results.devDomain) {
            sstConfig = sstConfig.replace(
              '"__DEV_DOMAIN__"',
              `"${results.devDomain}"`,
            );
          } else {
            sstConfig = sstConfig.replace('"__DEV_DOMAIN__"', "undefined");
          }

          await fs.writeFile(sstConfigPath, sstConfig);

          // Save the package manager to config.json
          const stateDir = path.join(targetDir, ".nuxflare", "state");
          await fs.ensureDir(stateDir);
          await fs.writeJson(
            path.join(stateDir, "config.json"),
            {
              packageManager: results.packageManager,
            },
            { spaces: 2 },
          );

          return "Project configured successfully";
        },
      },
      {
        title: "Setting up GitHub Actions",
        task: async () => {
          if (results.githubActions === "none") {
            return "GitHub Actions setup skipped";
          }

          const githubDir = path.join(targetDir, ".github", "workflows");
          await fs.ensureDir(githubDir);

          // Copy and render the action.yml template
          const engine = new Liquid()
          const template = engine.parse(await fs.readFile(path.join(initDir, "action.yml.liquid"), "utf8"));
          const actionContent = await engine.render(template, { 
            package_manager: results.packageManager,
            github_action_type: results.githubActions
          });

          await fs.writeFile(
            path.join(githubDir, "nuxflare-deploy.yml"),
            actionContent
          );
          return "GitHub Actions setup complete";
        },
      },
      {
        title: "Updating .gitignore",
        task: async () => {
          const gitignoreExists = await fs.pathExists(".gitignore");

          if (gitignoreExists) {
            const gitignore = await fs.readFile(".gitignore", "utf8");
            if (!gitignore.includes(".sst")) {
              await fs.appendFile(".gitignore", "\n.sst\n");
            }
            if (!gitignore.includes(".nuxflare")) {
              await fs.appendFile(".gitignore", "\n.nuxflare\n");
            }
          } else {
            await fs.writeFile(".gitignore", ".sst\n.nuxflare\n");
          }
          return ".gitignore updated";
        },
      },
      {
        title: `Installing SST.dev and Wrangler with ${results.packageManager}`,
        task: async () => {
          await runCommand(`${results.packageManager} install -D sst wrangler`);
          return "Installed SST.dev and Wrangler successfully";
        },
      },
      {
        title: "Initializing SST.dev",
        task: async () => {
          await runCommand(`${results.packageManager} sst install`);
          return "Initialized SST.dev successfully";
        },
      },
    ]);

    log.success(chalk.green("✅ Successfully initialized Nuxflare!"));

    p.note(
      [
        `1. Run ${chalk.cyan(
          "nuxflare deploy --stage <stage>",
        )} to do a preview deployment.`,
        `2. Run ${chalk.cyan(
          "nuxflare deploy --production",
        )} to deploy to production.`,
        `3. Run ${chalk.cyan(
          "nuxflare dev --stage <stage>",
        )} to run a local dev server and connect to remote resources.`,
        `4. Run ${chalk.cyan(
          "nuxflare copy-env --stage <stage> --file .env",
        )} to copy environment variables from a .env file to a stage.`
      ].join("\n"),
      "Next steps",
    );
  } catch (error) {
    log.error(`Error initializing nuxflare: ${error}`);
    process.exit(1);
  }
}
