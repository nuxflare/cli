![Nuxflare Logo](https://nuxflare.com/pwa-192x192.png)

# Nuxflare

The fastest, open-source way to deploy your Nuxt applications to Cloudflare.
Nuxflare streamlines deployment with a single CLI command and requires only a Cloudflare API token — no additional accounts or complex setup needed.

## Overview

Nuxflare is a deployment tool that automatically provisions and configures Cloudflare resources according to your [NuxtHub](https://hub.nuxt.com) configuration. This enables you to:

- Deploy full-stack Nuxt applications to Cloudflare's global network
- Integrate seamlessly with the `@nuxt-hub/core` module
- Manage all your Cloudflare resources through a simple configuration

### How Nuxflare Works with NuxtHub

**What is NuxtHub?**  
NuxtHub is a platform for managing and deploying full-stack Nuxt applications globally using Cloudflare's infrastructure.

**Important:** Nuxflare operates completely independently from the NuxtHub platform:

- No NuxtHub account required
- No NuxtHub subscription needed
- Only a Cloudflare API token is necessary

Nuxflare simply follows the NuxtHub configuration format to deploy your resources directly to your own Cloudflare account.

### Key Features

- **Simplified Deployment**: Single-command deployment using Infrastructure as Code (powered by [SST](https://sst.dev))
- **CI/CD Integration**: Easily incorporate into your existing pipelines
- **Minimal Requirements**: Only needs a Cloudflare API token
- **Automatic Resource Provisioning**: Handles all NuxtHub services:
  - AI
  - Blob Storage
  - Database
  - Cache
  - KV Storage
  - Vectorize

## Quick Start

### 1. Clone a Template

Start with a NuxtHub template that showcases the full capabilities of Nuxflare:

```bash
git clone https://github.com/RihanArfan/chat-with-pdf.git
```

### 2. Initialize Nuxflare

Set up your project using the Nuxflare CLI:

```bash
npx nuxflare init
```

During initialization, you'll be guided through a simple setup process where you'll:

- **Name your project**: Choose a unique identifier for your deployment
- **Select package manager**: Pick your preferred tool (npm, yarn, pnpm, or bun)
- **Set up production and development domains**: Configure custom domains or use free Cloudflare Workers subdomains
- **Create API credentials**: Generate a Cloudflare API token with the necessary permissions

After initialization, Nuxflare automatically:

- Creates a `sst.config.ts` file that defines your infrastructure as code
- Sets up a `nuxflare` directory containing utility files and configurations

These configuration files should be committed to your repository. You can further customize the `sst.config.ts` file to extend your deployment, such as adding more Cloudflare resources or configuring Durable Objects.

### 3. Configure Environment Variables

Transfer your local environment variables to your deployment stage:

```bash
npx nuxflare copy-env --stage dev
# or for production
npx nuxflare copy-env --production
```

This will:

1. Read variables from your local `.env` file
2. Preview the variables to be transferred
3. Configure the environment for your specified stage

### 4. Deploy Your Application

Deploy to your desired environment:

```bash
npx nuxflare deploy --stage dev
# or for production
npx nuxflare deploy --production
```

You can use custom stage names to deploy multiple instances to a single account.

### 5. Local Development

Connect to your deployed remote environment during development:

```bash
npx nuxflare dev --stage dev
# or for production
npx nuxflare dev --production
```

This launches the Nuxt development server and connects to your specified remote using `NUXT_HUB_PROJECT_URL` and `NUXT_HUB_PROJECT_SECRET_KEY`, giving you access to remote resources (D1, Blob, KV, AI, Cache) and allowing you to run Nitro tasks remotely.

### 6. Access Your Application

Open your project URL in the browser:

```bash
npx nuxflare open --stage dev
# or for production
npx nuxflare open --production
```

### 7. Monitor Real-Time Logs

View real-time logs from your deployment:

```bash
npx nuxflare logs --stage dev
# or for production
npx nuxflare logs --production
```

### 8. Clean Up Resources

Remove all provisioned resources when needed:

```bash
npx nuxflare remove --stage dev
# or for production
npx nuxflare remove --production
```

This will clean up all resources (D1, KV, Vectorize, Blob, AI, Workers) associated with the specified stage.

### 9. GitHub Actions

Set up automated deployments for your Nuxflare project:

```bash
# GitHub Actions is configured during initialization
# You can choose from different deployment strategies
npx nuxflare init
```

During the init process, you can select from these options:

- **Manual deployments only**: Trigger deployments via workflow_dispatch
- **Production deployments only**: Auto-deploy when pushing to the main branch
- **Full setup**: Both production deployments and preview deployments for PRs

After setup:

1. Add your Cloudflare API token as a GitHub repository secret:

   - Go to your repository → Settings → Secrets and variables → Actions
   - Create a new repository secret named `CLOUDFLARE_API_TOKEN`

2. Customize your workflow in `.github/workflows/nuxflare-deploy.yml`

3. Trigger deployments:
   - **Automatic**: Push to main branch (if configured)
   - **Manual**: Go to Actions → Nuxflare Deploy → Run workflow
   - **Pull Request**: Automatically creates preview deployments (if configured)

Each deployment creates a unique stage environment based on branch names or custom inputs, making it easy to test changes before production.
