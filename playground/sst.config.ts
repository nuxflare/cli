/// <reference path="./.sst/platform/config.d.ts" />
const prodDomain = undefined;
const devDomain = undefined;

export default $config({
  app(input) {
    return {
      name: "tanay-chat",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        command: "1.0.1",
        random: "4.17.0",
      },
    };
  },
  async run() {
    const { Nuxt } = await import("./nuxflare/nuxt");
    const domain =
      $app.stage === "production"
        ? prodDomain || undefined
        : devDomain
        ? `${$app.stage}.${devDomain}`
        : undefined;
    Nuxt("App", {
      dir: ".",
      domain,
    });
  },
});
