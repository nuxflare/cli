import { fileURLToPath } from 'url';
import path from 'path';

export const rootPath = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
