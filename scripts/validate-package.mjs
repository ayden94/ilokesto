import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const requiredFiles = ['dist/index.js', 'dist/index.d.ts', 'package.json'];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing package file: ${file}`);
  }
}

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
});
const [packResult] = JSON.parse(packOutput);
const packedFiles = new Set(packResult.files.map((file) => file.path));

for (const file of requiredFiles) {
  if (!packedFiles.has(file)) {
    throw new Error(`Packed tarball is missing: ${file}`);
  }
}

await import('../dist/index.js');

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

if (packageJson.exports?.['.']?.import !== './dist/index.js') {
  throw new Error('Unexpected root import export path.');
}

if (packageJson.exports?.['.']?.types !== './dist/index.d.ts') {
  throw new Error('Unexpected root types export path.');
}

console.log('package validation ok');
