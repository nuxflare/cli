import * as path from "node:path";
import { Semaphore } from "./semaphore";

const limiter = new Semaphore(
  parseInt(process.env.SST_BUILD_CONCURRENCY_SITE || "1"),
);
export async function builder(
  name: string,
  {
    dir,
    env,
    packageManager,
  }: { dir: string; env?: Record<string, any>; packageManager: string },
): Promise<any> {
  return new Promise((res) => {
    $resolve({ env }).apply(async ({ env }) => {
      // acquire semaphore after only resolving environment and we are ready to build
      await limiter.acquire();
      const cmd = new command.local.Command(`${name}Build`, {
        dir: path.resolve(dir),
        create: `[ -z "$SKIP_BUILD" ] && NITRO_PRESET=cloudflare-module ${packageManager} run build || ( [ -n "$SKIP_BUILD" ] && echo "Skipping build." )`,
        update: `[ -z "$SKIP_BUILD" ] && NITRO_PRESET=cloudflare-module ${packageManager} run build || ( [ -n "$SKIP_BUILD" ] && echo "Skipping build." )`,
        triggers: [new Date().toString()],
        environment: env,
      });
      cmd.urn.apply(() => {
        limiter.release();
        res(cmd);
      });
    });
  });
}
