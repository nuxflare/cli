import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { getExecutableCommand } from "../utils/package-manager";

export async function init() {
  try {
    // Check if nuxt.config exists
    if (!fs.existsSync("nuxt.config.ts") && !fs.existsSync("nuxt.config.js")) {
      console.error(
        chalk.red(
          "❌ No nuxt.config file found. Please run this command in a Nuxt project.",
        ),
      );
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "What is your project name?",
        default: path.basename(process.cwd()),
      },
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager do you use?",
        choices: ["npm", "yarn", "pnpm", "bun"],
        default: "npm",
      },
    ]);

    // Read and process sst.config.ts template
    const templatePath = path.join(__dirname, "../templates/sst.config");
    let templateContent = await fs.readFile(templatePath, "utf8");
    // Determine the correct commands based on package manager
    const npmCommand = answers.packageManager;
    const npxCommand = getExecutableCommand(answers.packageManager);

    templateContent = templateContent
      .replace("__PROJECT_NAME__", answers.projectName)
      .replace(/__NPM__/g, npmCommand)
      .replace(/__NPX__/g, npxCommand);
    await fs.writeFile("sst.config.ts", templateContent);

    // Update .gitignore
    if (fs.existsSync(".gitignore")) {
      const gitignore = await fs.readFile(".gitignore", "utf8");
      if (!gitignore.includes(".sst")) {
        await fs.appendFile(".gitignore", "\n.sst\n");
      }
    } else {
      await fs.writeFile(".gitignore", ".sst\n");
    }

    console.log(chalk.green("\n✅ Successfully initialized nuxflare!"));
    console.log(chalk.blue("\nNext steps:"));
    console.log(
      `Run ${chalk.cyan(
        "nuxflare deploy --stage <stage>",
      )} to deploy your app.`,
    );
  } catch (error) {
    console.error(chalk.red("Error initializing nuxflare:"), error);
    process.exit(1);
  }
}
