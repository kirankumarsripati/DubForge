import { execSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const packageDir = realpathSync(join(rootDir, 'apps/desktop/node_modules/better-sqlite3'));

execSync('npx --yes prebuild-install', { cwd: packageDir, stdio: 'inherit' });
