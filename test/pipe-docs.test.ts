import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type PipeExample = {
  readonly code: string;
  readonly id: string;
};

type Marker = {
  readonly end: number;
  readonly id: string;
};

type CompilerRun = {
  readonly diagnostics: string;
  readonly exitCode: number;
};

const decoder = new TextDecoder();
const projectRoot = join(import.meta.dir, '..');
const readmePath = join(projectRoot, 'README.md');
const koreanReadmePath = join(projectRoot, 'README.ko.md');

function extractMarkedPipeExamples(markdown: string, documentName: string): readonly PipeExample[] {
  const markers = new Map<string, Marker>();
  const markerComments = /<!--\s*pipe-example:([\s\S]*?)-->/g;

  for (const match of markdown.matchAll(markerComments)) {
    const rawId = match[1];
    const index = match.index;
    const id = rawId?.trim();
    if (id === undefined || index === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error('Each pipe example marker must use a stable lowercase kebab-case ID');
    }
    if (markers.has(id)) {
      throw new Error(`Duplicate pipe example marker: ${id}`);
    }

    markers.set(id, { end: index + match[0].length, id });
  }

  const examples: PipeExample[] = [];
  const usedMarkers = new Set<string>();
  const fences = /```(?:ts|typescript)\r?\n([\s\S]*?)```/g;

  for (const match of markdown.matchAll(fences)) {
    const code = match[1];
    const index = match.index;
    if (code === undefined || index === undefined) {
      throw new Error('TypeScript fence extraction failed');
    }

    const marker = [...markers.values()].find(
      (candidate) => candidate.end <= index && markdown.slice(candidate.end, index).trim().length === 0,
    );
    const usesPipeContract =
      code.includes("from '@ilokesto/state/utils'") &&
      (code.includes('pipe') || code.includes('definePipeableMiddleware'));

    if (usesPipeContract && marker === undefined) {
      throw new Error(`Each ${documentName} pipe TypeScript fence must have a pipe-example marker`);
    }
    if (marker !== undefined) {
      examples.push({ code, id: marker.id });
      usedMarkers.add(marker.id);
    }
  }

  for (const marker of markers.values()) {
    if (!usedMarkers.has(marker.id)) {
      throw new Error(`Pipe example marker ${marker.id} must immediately precede a TypeScript fence`);
    }
  }
  if (examples.length === 0) {
    throw new Error(`${documentName} must contain marked pipe examples`);
  }

  return examples;
}

function runCommand(command: readonly string[]): CompilerRun {
  const result = Bun.spawnSync({
    cmd: [...command],
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  return {
    diagnostics: `${decoder.decode(result.stdout)}${decoder.decode(result.stderr)}`,
    exitCode: result.exitCode,
  };
}

function compileExample(example: PipeExample): CompilerRun {
  const temporaryProject = mkdtempSync(join(tmpdir(), 'ilokesto-state-pipe-docs-'));

  try {
    const packageDirectory = join(temporaryProject, 'node_modules', '@ilokesto');
    const packageLink = join(packageDirectory, 'state');
    const tsconfigPath = join(temporaryProject, 'tsconfig.json');

    mkdirSync(packageDirectory, { recursive: true });
    symlinkSync(projectRoot, packageLink, 'dir');
    writeFileSync(join(temporaryProject, 'package.json'), '{"type":"module"}\n');
    writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          noEmit: true,
          strict: true,
          target: 'ESNext',
        },
        include: ['index.ts'],
      }),
    );
    writeFileSync(join(temporaryProject, 'index.ts'), example.code);

    return runCommand(['pnpm', 'exec', 'tsc', '--noEmit', '-p', tsconfigPath]);
  } finally {
    rmSync(temporaryProject, { force: true, recursive: true });
  }
}

test('Given marked English pipe examples, when compiled against a fresh package build, then compiles marked English pipe examples without diagnostics', () => {
  // Given
  const build = runCommand(['pnpm', 'build']);
  const examples = extractMarkedPipeExamples(readFileSync(readmePath, 'utf8'), 'English README');

  // When / Then
  expect(build.exitCode).toBe(0);
  expect(build.diagnostics).toContain('rm -rf dist && tsc');
  for (const example of examples) {
    const result = compileExample(example);
    expect(result.exitCode, `${example.id}\n${result.diagnostics}`).toBe(0);
    expect(result.diagnostics, example.id).toBe('');
  }
}, { timeout: 180_000 });

test('Given marked Korean pipe examples, when compiled against a fresh package build, then compiles marked Korean pipe examples without diagnostics', () => {
  // Given
  const build = runCommand(['pnpm', 'build']);
  const examples = extractMarkedPipeExamples(readFileSync(koreanReadmePath, 'utf8'), 'Korean README');

  // When / Then
  expect(build.exitCode).toBe(0);
  expect(build.diagnostics).toContain('rm -rf dist && tsc');
  for (const example of examples) {
    const result = compileExample(example);
    expect(result.exitCode, `${example.id}\n${result.diagnostics}`).toBe(0);
    expect(result.diagnostics, example.id).toBe('');
  }
}, { timeout: 180_000 });

test('Given bilingual pipe documentation, when their marked examples are compared, then documents equivalent bilingual pipe contracts', () => {
  // Given
  const englishExamples = extractMarkedPipeExamples(readFileSync(readmePath, 'utf8'), 'English README');
  const koreanExamples = extractMarkedPipeExamples(readFileSync(koreanReadmePath, 'utf8'), 'Korean README');

  // When / Then
  expect(koreanExamples.map((example) => example.id).sort()).toEqual(
    englishExamples.map((example) => example.id).sort(),
  );
}, { timeout: 20_000 });

test('Given malformed marker input, when marked pipe examples are extracted, then missing and duplicate markers fail', () => {
  // Given / When / Then
  expect(() => extractMarkedPipeExamples("```ts\nimport { pipe } from '@ilokesto/state/utils';\npipe;\n```", 'English README'))
    .toThrow('Each English README pipe TypeScript fence must have a pipe-example marker');
  expect(() => extractMarkedPipeExamples('<!-- pipe-example:duplicate -->\n```ts\nconst a = 1;\n```\n<!-- pipe-example:duplicate -->\n```ts\nconst b = 2;\n```', 'English README'))
    .toThrow('Duplicate pipe example marker: duplicate');
}, { timeout: 20_000 });
