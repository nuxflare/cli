#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import path from "path";
import { init } from "./commands/init.js";
import { deploy } from "./commands/deploy.js";
import { remove } from "./commands/remove.js";
import { dev } from "./commands/dev.js";
import { openProject } from "./commands/open.js";
import { copyEnv } from "./commands/copy-env.js";
import { logs } from "./commands/logs.js";
import updateNotifier from "update-notifier";
import { rootPath } from "./utils/dirname.js";

const pkgJsonPath = path.join(rootPath, "../package.json");
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));

function checkForUpdates() {
  updateNotifier({ pkg }).notify();
}

function run() {
  checkForUpdates();

  const program = new Command();
  program
    .name("nuxflare")
    .description("Deploy your Nuxt apps to Cloudflare using Nuxflare CLI.")
    .version(pkg.version);
  program
    .command("init")
    .description("initialize Nuxflare in your existing Nuxt project")
    .action(init);
  program
    .command("deploy")
    .description("deploy your project to Cloudflare.")
    .option("--production", "deploy your project to production")
    .option("--stage <stage>", "deploy your project to a preview stage")
    .action(deploy);
  program
    .command("remove")
    .description("remove all resources for a deployment")
    .option("--production", "remove resources for the production deployment")
    .option("--stage <stage>", "remove resources for a preview deployment")
    .action(remove);
  program
    .command("dev")
    .description("run nuxt dev server while connecting to remote resources")
    .option("--production", "connect to production resources")
    .option("--stage <stage>", "connect to resources for a preview stage")
    .action(dev);
  program
    .command("open")
    .description("open your project URL in the default browser")
    .option("--production", "open the production project URL")
    .option("--stage <stage>", "open a preview stage project URL")
    .action(openProject);
  program
    .command("logs")
    .description("view real-time logs from cloudflare")
    .option("--production", "view logs from the production deployment")
    .option("--stage <stage>", "view logs from a preview stage deployment")
    .action(logs);
  program
    .command("copy-env")
    .alias("load-env")
    .description("load environment variables from a .env file")
    .option("--production", "load environment for production")
    .option("--stage <stage>", "load environment for a preview stage")
    .option("--file <file>", "specify a custom .env file path")
    .action(copyEnv);
  program.parse();
}

run();
