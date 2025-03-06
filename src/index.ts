#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from 'fs';
import path from 'path';
import { init } from "./commands/init.js";
import { deploy } from "./commands/deploy.js";
import { remove } from "./commands/remove.js";
import { dev } from "./commands/dev.js";
import { copyEnv } from "./commands/copy-env.js";
import updateNotifier from "update-notifier";
import { rootPath } from "./utils/dirname.js";

const pkgJsonPath = path.join(rootPath, '../package.json');
const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

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
    .option("--production", "Connect to production resources")
    .option("--stage <stage>", "Connect to resources for a preview stage")
    .action(dev);
  program
    .command("copy-env")
    .alias("load-env")
    .description("load environment variables from a .env file")
    .option("--production", "Load environment for production")
    .option("--stage <stage>", "Load environment for a preview stage")
    .option("--file <file>", "Specify a custom .env file path")
    .action(copyEnv);
  program.parse();
}

run();
