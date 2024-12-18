#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./commands/init";
import { deploy } from "./commands/deploy";
import { remove } from "./commands/remove";
import { dev } from "./commands/dev";
import { copyEnv } from "./commands/copy-env";

const program = new Command();

program
  .name("nuxflare")
  .description("CLI tool for deploying Nuxt apps to Cloudflare")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize nuxflare in your Nuxt project")
  .action(init);

program
  .command("deploy")
  .description("Deploy your Nuxt app to Cloudflare")
  .allowUnknownOption(true)
  .action(deploy);

program
  .command("remove")
  .description("Remove all resources")
  .allowUnknownOption(true)
  .action(remove);

program
  .command("dev")
  .description("Run Nuxt dev server with remote")
  .option("--stage <stage>", "Stage to use for Hub integration")
  .action(dev);

program
  .command("copy-env")
  .description("Copy environment variables from .env")
  .requiredOption("--stage <stage>", "Stage to copy environment variables to")
  .action(copyEnv);

program.parse();
