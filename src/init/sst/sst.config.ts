/// <reference path="./.sst/platform/config.d.ts" />
import Nuxt from "./.nuxflare/utils/nuxt";

const prodDomain = "__PROD_DOMAIN__";
const devDomain = "__DEV_DOMAIN__";

export default $config({
  app(input) {
    return {
      name: "__PROJECT_NAME__",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "cloudflare",
      providers: {
        cloudflare: true,
        command: "1.0.1",
        random: "4.17.0",
      },
    };
  },
  async run() {
    const domain =
      $app.stage === "production"
        ? prodDomain || undefined
        : devDomain
        ? `${$app.stage}.${devDomain}`
        : undefined;
    Nuxt("App", {
      dir: ".",
      domain,
      packageManager: "__PACKAGE_MANAGER__",
    });
  },
});
