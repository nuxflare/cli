import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import * as path from "node:path";
import { loadNuxtConfig } from "nuxt/kit";
import { builder } from "./builder";
import { PACKAGE_MANAGER_COMMANDS, getPackageManager } from "./package-manager";

const DEFAULT_CLOUDFLARE_COMPATIBILITY_DATE = "2024-12-05";
const BINDINGS = {
  ASSETS: "ASSETS",
  DATABASE: "DB",
  AI: "AI",
  KV: "KV",
  CACHE: "CACHE",
  BLOB: "BLOB",
} as const;

type DatabaseConfig = { id: string; name: string } | sst.cloudflare.D1;

class WranglerConfigBuilder {
  private config: Record<string, any> = {};

  constructor(name: string, outputDir: string, compatibilityDate?: string) {
    this.config = {
      name: name.toLowerCase(),
      main: path.resolve(outputDir, "server", "index.mjs"),
      compatibility_date:
        compatibilityDate || DEFAULT_CLOUDFLARE_COMPATIBILITY_DATE,
      compatibility_flags: ["nodejs_compat"],
      observability: { enabled: true },
    };
  }

  addAssets(publicDir: string): this {
    this.config.assets = {
      directory: publicDir,
      binding: BINDINGS.ASSETS,
    };
    return this;
  }

  addDomain(domain?: string): this {
    if (domain) {
      this.config.routes = [
        {
          pattern: domain,
          custom_domain: true,
        },
      ];
    }
    return this;
  }

  addD1Database(database: DatabaseConfig, migrationsDir: string): this {
    this.config.d1_databases ||= [];
    if (database instanceof sst.cloudflare.D1) {
      this.config.d1_databases.push({
        binding: BINDINGS.DATABASE,
        database_name: database.nodes.database.name,
        database_id: database.nodes.database.id,
        migrations_dir: migrationsDir,
      });
    } else {
      this.config.d1_databases.push({
        binding: BINDINGS.DATABASE,
        database_name: database.name,
        database_id: database.id,
        migrations_dir: migrationsDir,
      });
    }
    return this;
  }

  addAI(): this {
    this.config.ai = {
      binding: BINDINGS.AI,
    };
    return this;
  }

  addKV(kv: sst.cloudflare.Kv, binding: string): this {
    this.config.kv_namespaces ||= [];
    this.config.kv_namespaces.push({
      binding,
      id: kv.id,
    });
    return this;
  }

  addBucket(blob: sst.cloudflare.Bucket): this {
    this.config.r2_buckets ||= [];
    this.config.r2_buckets.push({
      binding: BINDINGS.BLOB,
      bucket_name: blob.name,
    });
    return this;
  }

  addVectorize(name: string, indexName: any): this {
    this.config.vectorize ||= [];
    this.config.vectorize.push({
      binding: `VECTORIZE_${name.toUpperCase()}`,
      index_name: indexName,
    });
    return this;
  }

  addVars(
    environment: sst.Secret,
    extraVars: Record<string, unknown>,
    nuxtHubSecret: typeof random.RandomUuid.prototype.result,
  ): this {
    this.config.vars = environment.value.apply((env) => {
      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(env);
      } catch (error) {
        console.warn("Failed to parse environment:", error);
      }
      return {
        NUXT_HUB_PROJECT_SECRET_KEY: nuxtHubSecret,
        ...parsedEnv,
        ...extraVars,
      };
    });
    return this;
  }

  async transform(
    transformFn?: (config: Record<string, unknown>) => Promise<void> | void,
  ): Promise<this> {
    if (transformFn) {
      await transformFn(this.config);
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.config;
  }
}

/**
 * Creates and configures a Nuxt.js application for Cloudflare Workers deployment
 *
 * @param name - Application name (must start with a capital letter, no hyphens)
 * @param options - Configuration options for the deployment
 * @param options.dir - Root directory of the Nuxt application
 * @param options.domain - Optional domain/subdomain. If not specified, automatic workers.dev subdomain is used
 * @param options.extraVars - Additional environment variables used in binding and building the Nuxt app
 * @param options.transformWrangler - Optional function to modify the wrangler configuration before deployment
 * @param options.packageManager - Package manager to use for building the app and running wrangler
 * @param options.compatibilityDate - Optionally specify the Cloudflare Workers compatibility date
 * @param options.database - Optional database configuration (existing or SST database)
 * @returns Promise that resolves when deployment is configured
 */
export async function Nuxt(
  name: string,
  {
    dir,
    domain,
    extraVars = {},
    transformWrangler,
    packageManager,
    database,
    compatibilityDate,
    outputDir,
  }: {
    dir: string;
    domain?: string;
    extraVars?: Record<string, unknown>;
    transformWrangler?: (
      wrangler: Record<string, unknown>,
    ) => Promise<void> | void;
    packageManager?: keyof typeof PACKAGE_MANAGER_COMMANDS;
    database?: DatabaseConfig;
    compatibilityDate?: string;
    outputDir?: string;
  },
) {
  const pack = packageManager || (await getPackageManager());
  const packageManagerX = PACKAGE_MANAGER_COMMANDS[pack];
  const projectPath = path.resolve(dir);
  // we use relative path for places where pulumi stores the path
  // this is to ensure we don't let pulumi store device specific paths
  const projectPathRelative = path.relative(
    path.resolve("./.sst/platform"),
    path.resolve(dir),
  );
  const environment = new sst.Secret("Env", "{}");
  const nuxtConfig = await loadNuxtConfig({ cwd: projectPath });
  const hubConfig = nuxtConfig.hub || {};
  const nuxtHubSecret = new random.RandomUuid(`${name}NuxtHubSecret`);
  const buildOutputPath = path.resolve(projectPath, outputDir || "dist");
  const migrationsPath = path.resolve(
    buildOutputPath,
    "database",
    "migrations",
  );

  const wranglerBuilder = new WranglerConfigBuilder(
    `${$app.name}-${$app.stage}-${name}`,
    buildOutputPath,
    compatibilityDate,
  )
    .addAssets(path.resolve(buildOutputPath, "public"))
    .addDomain(domain)
    .addVars(environment, extraVars, nuxtHubSecret.result);

  const resources: any[] = [];
  const databaseConfig: { name?: any } = {};

  if (hubConfig.database) {
    if (database instanceof sst.cloudflare.D1) {
      resources.push(database);
      wranglerBuilder.addD1Database(database, migrationsPath);
      databaseConfig.name = database.nodes.database.name;
    } else if (database) {
      wranglerBuilder.addD1Database(database, migrationsPath);
      databaseConfig.name = database.name;
    } else {
      const database = new sst.cloudflare.D1(BINDINGS.DATABASE);
      resources.push(database);
      wranglerBuilder.addD1Database(database, migrationsPath);
      databaseConfig.name = database.nodes.database.name;
    }
  }

  if (hubConfig.ai) {
    wranglerBuilder.addAI();
  }

  if (hubConfig.kv) {
    const kv = new sst.cloudflare.Kv(BINDINGS.KV);
    resources.push(kv);
    wranglerBuilder.addKV(kv, BINDINGS.KV);
  }

  if (hubConfig.cache) {
    const cache = new sst.cloudflare.Kv(BINDINGS.CACHE);
    resources.push(cache);
    wranglerBuilder.addKV(cache, BINDINGS.CACHE);
  }

  if (hubConfig.blob) {
    const blob = new sst.cloudflare.Bucket(BINDINGS.BLOB);
    resources.push(blob);
    wranglerBuilder.addBucket(blob);
  }

  if (hubConfig.vectorize) {
    for (const [name, config] of Object.entries(hubConfig.vectorize)) {
      const indexName = `${$app.name}-${$app.stage}-${name}`;
      const index = new command.local.Command(`Vector${indexName}`, {
        dir: projectPathRelative,
        create: `${packageManagerX} wrangler vectorize create ${indexName} --dimensions=${config.dimensions} --metric=${config.metric} || true`,
        delete: `${packageManagerX} wrangler vectorize delete ${indexName} --force || true`,
      });
      resources.push(index);
      for (const [propertyName, type] of Object.entries(
        config.metadataIndexes || {},
      )) {
        new command.local.Command(
          `MetadataIndex${indexName}${propertyName}`,
          {
            dir: projectPathRelative,
            create: `${packageManagerX} wrangler vectorize create-metadata-index ${indexName} --property-name=${propertyName} --type=${type} || true`,
            delete: `${packageManagerX} wrangler vectorize delete-metadata-index ${indexName} --property-name=${propertyName} || true`,
          },
          {
            dependsOn: [index],
          },
        );
      }
      wranglerBuilder.addVectorize(
        name,
        index.stdout.apply(() => indexName),
      );
    }
  }

  await wranglerBuilder.transform(transformWrangler);
  const wrangler = wranglerBuilder.build();

  $resolve(wrangler).apply((wrangler) => {
    const stateDir = path.resolve(`.nuxflare/state/${$app.stage}/${name}`);
    const wranglerConfigPath = path.resolve(stateDir, "wrangler.json");

    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    writeFileSync(wranglerConfigPath, JSON.stringify(wrangler, null, 2));

    const build = builder(name, {
      dir: projectPath,
      env: { ...extraVars },
      packageManager: pack,
    });

    const deploy = new command.local.Command(
      `${name}WorkerVersion`,
      {
        dir: projectPathRelative,
        create: `${packageManagerX} wrangler deploy --config ${wranglerConfigPath}`,
        triggers: [new Date().toString()],
        logging: command.local.Logging.Stderr,
      },
      {
        dependsOn: [build, ...resources],
      },
    );

    $resolve([deploy.urn, nuxtHubSecret.result]).apply(async ([_, secret]) => {
      let projectUrl;
      if (domain) {
        projectUrl = `https://${domain}`;
      } else {
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        if (!apiToken) {
          console.error(
            "CLOUDFLARE_API_TOKEN environment variable is required",
          );
          return;
        }
        // First, get the account ID if not set
        let accountId =
          process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID ||
          process.env.CLOUDFLARE_ACCOUNT_ID;
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
          if (!accountData.success || !accountData.result?.[0]?.id) {
            console.error("Failed to fetch Cloudflare account ID");
            return;
          }
          accountId = accountData.result[0].id;
        }
        // Then proceed with getting the workers subdomain
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
        if (data.success) {
          const workersDomain = data.result.subdomain;
          projectUrl = `https://${wrangler.name}.${workersDomain}.workers.dev`;
        } else {
          console.error("Failed to fetch workers subdomain");
          projectUrl = "";
        }
      }
      const stateFile = path.resolve(stateDir, "state.json");
      const stateData = {
        projectUrl,
        nuxtHubSecret: secret,
      };
      writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
    });

    new command.local.Command(
      `${name}Worker`,
      {
        dir: projectPathRelative,
        delete: `${packageManagerX} wrangler delete --name ${wrangler.name} || true`,
      },
      {
        dependsOn: [deploy],
      },
    );

    if (databaseConfig.name) {
      $resolve([deploy.urn, databaseConfig.name]).apply(([_, name]) => {
        new command.local.Command(
          `${name}Migrations`,
          {
            dir: projectPathRelative,
            create: `${existsSync(migrationsPath)
              ? `${packageManagerX} wrangler --config ${wranglerConfigPath} d1 migrations apply ${name} --remote`
              : 'echo "Migrations directory not found, skipping."'
              }`,
            triggers: [new Date().toString()],
          },
          { dependsOn: [deploy] },
        );
      });
    }
  });
}
