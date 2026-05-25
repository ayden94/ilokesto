import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

const distRoot = resolve('dist');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJavaScriptFiles(path);
    }

    return entry.isFile() && path.endsWith('.js') ? [path] : [];
  }));

  return files.flat();
}

async function resolveRuntimeSpecifier(filePath, specifier) {
  if (!specifier.startsWith('.') || extname(specifier) !== '') {
    return specifier;
  }

  const basePath = resolve(dirname(filePath), specifier);

  if (await exists(`${basePath}.js`)) {
    return `${specifier}.js`;
  }

  if (await exists(join(basePath, 'index.js'))) {
    return `${specifier}/index.js`;
  }

  return specifier;
}

async function fixFile(filePath) {
  const source = await readFile(filePath, 'utf8');
  const specifierPattern = /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\)?)/g;
  let changed = false;
  let output = '';
  let cursor = 0;

  for (const match of source.matchAll(specifierPattern)) {
    const [fullMatch, prefix, specifier, suffix] = match;
    const start = match.index;
    const nextSpecifier = await resolveRuntimeSpecifier(filePath, specifier);

    output += source.slice(cursor, start);
    output += `${prefix}${nextSpecifier}${suffix}`;
    cursor = start + fullMatch.length;
    changed ||= nextSpecifier !== specifier;
  }

  if (!changed) {
    return false;
  }

  output += source.slice(cursor);
  await writeFile(filePath, output);
  return true;
}

const files = await listJavaScriptFiles(distRoot);
let changedCount = 0;

for (const file of files) {
  if (await fixFile(file)) {
    changedCount += 1;
  }
}

console.log(`Fixed runtime import specifiers in ${changedCount} dist file(s).`);
