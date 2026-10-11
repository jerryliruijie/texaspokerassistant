import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./generate_equity.py', import.meta.url));
const result = spawnSync(process.env.PYTHON || 'python', [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
