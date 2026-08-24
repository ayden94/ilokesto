import { expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { compileTypeFiles } from './helpers/compileTypeFiles';

const projectRoot = join(import.meta.dir, '..');
const docsRoot = join(projectRoot, 'docs');
const languages = ['en', 'ko'] as const;
const documentedPublicExports = [
  'AngularOptions',
  'HistoryConfigurationError',
  'HistoryControls',
  'HistoryOptions',
  'HistoryStore',
  'OnRehydrateStorage',
  'OnRehydrateStorageCallback',
  'PersistControls',
  'PersistDecoder',
  'PersistDecoderStateDiagnostic',
  'PersistMigration',
  'PersistStore',
  'Pipe',
  'PipeAnyMiddleware',
  'PipeBuilder',
  'PipeCapability',
  'PipeConfigurationError',
  'PipeConfigurationErrorCode',
  'PipeDuplicatePolicy',
  'PipeMiddleware',
  'PipeMiddlewareConflictDiagnostic',
  'PipeMiddlewareMetadata',
  'SafePersistConfig',
  'SafePersistCookieConfig',
  'SafePersistLocalConfig',
  'SafePersistSessionConfig',
  'UseReducer',
  'UseState',
  'adaptor',
  'create',
  'debounce',
  'definePipeableMiddleware',
  'devtools',
  'dispose',
  'history',
  'logger',
  'persist',
  'pipe',
  'throttle',
  'validate',
] as const;

type TaggedExample = {
  readonly code: string;
  readonly id: string;
};

function walk(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function readMeta(directory: string): { readonly pages: readonly string[] } {
  return JSON.parse(readFileSync(join(directory, 'meta.json'), 'utf8')) as { readonly pages: readonly string[] };
}

function assertNavigationResolves(directory: string): void {
  for (const page of readMeta(directory).pages) {
    if (page.startsWith('---')) {
      continue;
    }

    if (page.startsWith('...')) {
      const childDirectory = join(directory, page.slice(3));
      expect(() => readMeta(childDirectory)).not.toThrow();
      assertNavigationResolves(childDirectory);
      continue;
    }

    for (const suffix of ['.mdx', '.ko.mdx']) {
      expect(walk(directory)).toContain(join(directory, `${page}${suffix}`));
    }
  }
}

function resolveInternalLink(link: string): string {
  const route = link.replace(/#.*/, '');
  const parts = route.split('/').filter(Boolean);
  const [, packageName, ...path] = parts;
  if (packageName !== 'state') {
    throw new TypeError(`Unexpected package link: ${link}`);
  }

  const base = join(docsRoot, ...path);
  if (path.length === 0) {
    return join(docsRoot, 'index.mdx');
  }

  const pagePath = `${base}.mdx`;
  return existsSync(pagePath) ? pagePath : join(base, 'index.mdx');
}

function extractTaggedExamples(path: string): readonly TaggedExample[] {
  const document = readFileSync(path, 'utf8');
  const examples: TaggedExample[] = [];
  const expression = /<!--\s*state-example:([a-z0-9][a-z0-9-]*)\s*-->\s*\n```(?:ts|typescript)\n([\s\S]*?)```/g;

  for (const match of document.matchAll(expression)) {
    const [, id, code] = match;
    if (id === undefined || code === undefined) {
      throw new TypeError(`Could not extract state example from ${path}`);
    }
    examples.push({ code, id });
  }

  return examples;
}

test('Given the state documentation surface, when navigation, locales, links, and public exports are checked, then they resolve consistently', () => {
  const mdxFiles = walk(docsRoot).filter((path) => path.endsWith('.mdx'));

  for (const englishPath of mdxFiles.filter((path) => !path.endsWith('.ko.mdx'))) {
    expect(mdxFiles).toContain(englishPath.replace(/\.mdx$/, '.ko.mdx'));
  }
  for (const koreanPath of mdxFiles.filter((path) => path.endsWith('.ko.mdx'))) {
    expect(mdxFiles).toContain(koreanPath.replace(/\.ko\.mdx$/, '.mdx'));
  }

  assertNavigationResolves(docsRoot);

  for (const language of languages) {
    for (const path of mdxFiles) {
      const document = readFileSync(path, 'utf8');
      for (const match of document.matchAll(new RegExp(`\\/${language}\\/state(?:\\/[a-z0-9-]+)*`, 'g'))) {
        const link = match[0];
        const expected = resolveInternalLink(link);
        expect(mdxFiles).toContain(expected.replace(/\.mdx$/, language === 'ko' ? '.ko.mdx' : '.mdx'));
      }
    }
  }

  for (const language of languages) {
    const surfacePath = join(docsRoot, 'reference', `package-surface${language === 'ko' ? '.ko' : ''}.mdx`);
    const surface = readFileSync(surfacePath, 'utf8');
    for (const exportedName of documentedPublicExports) {
      expect(
        exportedName === 'create' ? surface.includes('`create()`') : surface.includes(`\`${exportedName}\``),
      ).toBeTrue();
    }
  }
});

test('Given tagged bilingual state documentation examples, when compiled against the package, then each current builder example type-checks', () => {
  const examplesFor = (language: (typeof languages)[number]): readonly TaggedExample[] =>
    walk(docsRoot)
      .filter((path) => path.endsWith(language === 'ko' ? '.ko.mdx' : '.mdx'))
      .filter((path) => language === 'ko' || !path.endsWith('.ko.mdx'))
      .flatMap(extractTaggedExamples);
  const examplesByLanguage = {
    en: examplesFor('en'),
    ko: examplesFor('ko'),
  } satisfies Record<(typeof languages)[number], readonly TaggedExample[]>;

  expect(examplesByLanguage.en.map(({ id }) => id).sort()).toEqual(
    examplesByLanguage.ko.map(({ id }) => id).sort(),
  );
  expect(examplesByLanguage.en.map(({ id }) => id).sort()).toEqual([
    'history-controls',
    'throttle-disposal',
  ]);

  const temporaryProject = mkdtempSync(join(tmpdir(), 'ilokesto-state-docs-'));
  try {
    const packageDirectory = join(temporaryProject, 'node_modules', '@ilokesto');
    mkdirSync(packageDirectory, { recursive: true });
    symlinkSync(projectRoot, join(packageDirectory, 'state'), 'dir');
    writeFileSync(join(temporaryProject, 'package.json'), '{"type":"module"}\n');

    const sourcePaths = languages.flatMap((language) =>
      examplesByLanguage[language].map(({ code, id }) => {
        const sourcePath = join(temporaryProject, `${language}-${id}.ts`);
        writeFileSync(sourcePath, code);
        return sourcePath;
      }),
    );
    const result = compileTypeFiles(sourcePaths);

    expect(result.exitCode, result.diagnostics).toBe(0);
    expect(result.diagnostics).toBe('');
  } finally {
    rmSync(temporaryProject, { force: true, recursive: true });
  }
});
