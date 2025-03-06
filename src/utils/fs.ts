import {
  mkdir,
  readFile,
  writeFile,
  stat,
  copyFile,
  readdir,
} from "fs/promises";
import path from "path";

/**
 * Checks if a file or directory exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await stat(dirPath);
  } catch (error) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Writes JSON data to a file
 */
export async function writeJson(
  filePath: string,
  data: any,
  options?: { spaces?: number },
): Promise<void> {
  const jsonContent = JSON.stringify(data, null, options?.spaces);
  await writeFile(filePath, jsonContent);
}

/**
 * Reads JSON data from a file
 */
export async function readJson(filePath: string): Promise<any> {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Copies files or directories recursively
 */
export async function copy(
  src: string,
  dest: string,
  options?: { overwrite?: boolean },
): Promise<void> {
  const stats = await stat(src);

  if (stats.isDirectory()) {
    await ensureDir(dest);
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copy(srcPath, destPath, options);
      } else {
        const destExists = await pathExists(destPath);
        if (!destExists || options?.overwrite) {
          await copyFile(srcPath, destPath);
        }
      }
    }
  } else {
    const destExists = await pathExists(dest);
    if (!destExists || options?.overwrite) {
      await copyFile(src, dest);
    }
  }
}
