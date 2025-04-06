import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import * as path from "node:path";
import { getPackageManager, PACKAGE_MANAGER_COMMANDS } from "./package-manager";

const DEFAULT_CLOUDFLARE_COMPATIBILITY_DATE = "2024-12-05";

interface WorkerOptions {
  name: string;
  dir?: string;
  domain?: string;
  buildCommand?: string;
  main?: string;
  packageManager?: keyof typeof PACKAGE_MANAGER_COMMANDS;
  compatibilityDate?: string;
  transformWrangler?: (config: Record<string, unknown>) => Promise<void> | void;
  durableObjects?: {
    className: string;
    bindingName: string;
  }[];
}

interface WorkerResult {
  name: string;
  url: any;
  websocketsUrl: any;
  urn: any;
}

export async function Worker(options: WorkerOptions): Promise<WorkerResult> {
  const packageManagerX =
    PACKAGE_MANAGER_COMMANDS[
      options.packageManager || (await getPackageManager())
    ];
  const projectPath = options.dir
    ? path.resolve(options.dir)
    : path.resolve(".");
  const projectPathRelative = path.relative(
    path.resolve("./.sst/platform"),
    projectPath,
  );

  const workerName = `${$app.name}-${$app.stage}-${options.name}`.toLowerCase();

  // Build wrangler config
  const wranglerConfig: Record<string, any> = {
    name: workerName,
    main: path.resolve(projectPath, options.main || "index.mjs"),
    compatibility_date:
      options.compatibilityDate || DEFAULT_CLOUDFLARE_COMPATIBILITY_DATE,
    compatibility_flags: ["nodejs_compat"],
  };

  if (options.domain) {
    wranglerConfig.routes = [
      {
        pattern: options.domain,
        custom_domain: true,
      },
    ];
  }

  if (options.durableObjects && options.durableObjects.length > 0) {
    wranglerConfig.durable_objects = { bindings: [] };
    wranglerConfig.migrations = [];
    for (const durableObject of options.durableObjects) {
      wranglerConfig.durable_objects.bindings.push({
        name: durableObject.bindingName,
        class_name: durableObject.className,
      });
      wranglerConfig.migrations.push({
        tag: `${durableObject.className}_migration`,
        new_classes: [durableObject.className],
      });
    }
  }

  // Allow custom transformations
  if (options.transformWrangler) {
    await options.transformWrangler(wranglerConfig);
  }

  // Create state directory and write wrangler config
  const stateDir = path.resolve(
    `.nuxflare/state/${$app.stage}/${options.name}`,
  );
  const wranglerConfigPath = path.resolve(stateDir, "wrangler.json");

  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  writeFileSync(wranglerConfigPath, JSON.stringify(wranglerConfig, null, 2));

  // Handle build step if specified
  let build: command.local.Command | undefined;
  if (options.buildCommand) {
    build = new command.local.Command(`${options.name}Build`, {
      dir: projectPathRelative,
      create: options.buildCommand,
      logging: command.local.Logging.Stderr,
    });
  }

  // Deploy worker
  const deploy = new command.local.Command(
    `${options.name}WorkerDeploy`,
    {
      dir: projectPathRelative,
      create: `${packageManagerX} wrangler deploy --config ${wranglerConfigPath}`,
      triggers: [new Date().toString()],
      logging: command.local.Logging.Stderr,
    },
    {
      dependsOn: build ? [build] : [],
    },
  );

  // Cleanup command
  new command.local.Command(
    `${options.name}WorkerCleanup`,
    {
      dir: projectPathRelative,
      delete: `${packageManagerX} wrangler delete --name ${workerName} || true`,
    },
    {
      dependsOn: [deploy],
    },
  );

  const endpoint = $resolve([]).apply(async () => {
    if (options.domain) {
      return options.domain;
    }
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!apiToken) {
      console.error("CLOUDFLARE_API_TOKEN environment variable is required");
      return "";
    }
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      const accountResponse = await fetch(
        "https://api.cloudflare.com/client/v4/accounts",
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      const accountData = await accountResponse.json();
      accountId = accountData.result?.[0]?.id;
    }
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data.success
      ? `${workerName}.${data.result.subdomain}.workers.dev`
      : "";
  });

  return {
    name: workerName,
    url: $resolve([endpoint]).apply(
      async ([endpoint]) => `https://${endpoint}`,
    ),
    websocketsUrl: $resolve([endpoint]).apply(
      async ([endpoint]) => `wss://${endpoint}`,
    ),
    urn: deploy.urn,
  };
}
