import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const relativeSpecifierPattern = /(from\s+['"]|import\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\)?)/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? walk(path) : path;
  }));

  return files.flat();
}

function needsExtension(specifier) {
  const lastSegment = specifier.split('/').at(-1) ?? '';

  return extname(lastSegment) === '';
}

function addJsExtensionToDeclarationImports(source) {
  return source.replace(relativeSpecifierPattern, (match, prefix, specifier, suffix) => {
    if (!needsExtension(specifier)) {
      return match;
    }

    return `${prefix}${specifier}.js${suffix}`;
  });
}

const declarationFiles = (await walk(distDir)).filter(file => file.endsWith('.d.ts'));

await Promise.all(declarationFiles.map(async file => {
  const source = await readFile(file, 'utf8');
  const nextSource = addJsExtensionToDeclarationImports(source);

  if (nextSource !== source) {
    await writeFile(file, nextSource);
  }
}));
