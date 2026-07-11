import { expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { compileTypeFixture } from './helpers/compileTypeFixture';

type InvalidFixture = {
  readonly diagnosticCount: number;
  readonly fixture: string;
  readonly markers: readonly string[];
};

type CommandResult = {
  readonly diagnostics: string;
  readonly exitCode: number;
};

const invalidFixtures = {
  builder: [
    { diagnosticCount: 1, fixture: 'invalid-callable-root', markers: ['__pipeCallableRootError'] },
    { diagnosticCount: 2, fixture: 'invalid-legacy-call', markers: ['__pipeCallableRootError'] },
    { diagnosticCount: 1, fixture: 'invalid-root-create', markers: ['__pipeRootCreateError'] },
    { diagnosticCount: 1, fixture: 'invalid-untagged-use', markers: ['__pipeUntaggedMiddlewareError'] },
    { diagnosticCount: 1, fixture: 'invalid-store-input', markers: ['__pipeStoreInputError'] },
  ],
  capability: [
    { diagnosticCount: 1, fixture: 'invalid-missing-capability', markers: ['__pipeMissingCapabilityError'] },
    { diagnosticCount: 1, fixture: 'invalid-duplicate-capability', markers: ['__pipeDuplicateCapabilityError'] },
    { diagnosticCount: 1, fixture: 'invalid-state', markers: ['__pipeStateCompatibilityError'] },
  ],
  graph: [
    { diagnosticCount: 2, fixture: 'invalid-duplicate', markers: ['__pipeDuplicateMiddlewareError'] },
    { diagnosticCount: 1, fixture: 'invalid-order', markers: ['__pipeMiddlewareOrderError'] },
    { diagnosticCount: 1, fixture: 'invalid-cycle', markers: ['__pipeMiddlewareCycleError'] },
  ],
  validate: [
    { diagnosticCount: 1, fixture: 'invalid-validate-initial-state', markers: ['__pipeStateCompatibilityError'] },
    { diagnosticCount: 1, fixture: 'invalid-validate-state', markers: ['__pipeStateCompatibilityError'] },
  ],
} as const satisfies Record<string, readonly InvalidFixture[]>;

const projectRoot = join(import.meta.dir, '..');
const decoder = new TextDecoder();

function buildDistribution(): CommandResult {
  const result = Bun.spawnSync({
    cmd: ['pnpm', 'build'],
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  return {
    diagnostics: `${decoder.decode(result.stdout)}${decoder.decode(result.stderr)}`,
    exitCode: result.exitCode,
  };
}

function expectInvalidFixture(contract: InvalidFixture): void {
  const result = compileTypeFixture(contract.fixture);
  const diagnosticLines = result.diagnostics.split('\n').filter((line) => line.includes('error TS'));

  expect(result.success).toBeFalse();
  expect(result.exitCode).toBe(1);
  expect(diagnosticLines).toHaveLength(contract.diagnosticCount);
  for (const marker of contract.markers) {
    expect(result.diagnostics).toContain(marker);
  }
  expect(result.diagnostics).not.toContain('Cannot find module');
  expect(result.diagnostics).not.toContain('TS5058');
}

function expectInvalidFixtures(contracts: readonly InvalidFixture[]): void {
  for (const contract of contracts) {
    expectInvalidFixture(contract);
  }
}

test('Given public pipe contracts, when valid fixtures compile in isolated programs, then they exit successfully', () => {
  // Given / When / Then
  for (const fixture of ['valid-types', 'valid-metadata', 'valid-capabilities', 'valid-builder', 'valid-validate']) {
    const result = compileTypeFixture(fixture);
    expect(result.success).toBeTrue();
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toBe('');
  }
}, { timeout: 90_000 });

test('Given invalid pipe contracts, when their isolated programs compile, then their branded diagnostics are preserved', () => {
  // Given / When / Then
  expectInvalidFixture({ diagnosticCount: 1, fixture: 'invalid-harness', markers: ['__fixtureExpectedError'] });
  expectInvalidFixtures(invalidFixtures.validate);
  expectInvalidFixtures(invalidFixtures.builder);
  expectInvalidFixtures(invalidFixtures.graph);
  expectInvalidFixtures(invalidFixtures.capability);
}, { timeout: 90_000 });

test('Given generated declarations, when public fixtures compile in isolated programs, then public contracts remain correct', () => {
  // Given
  const sourceModifiedAt = statSync(join(projectRoot, 'src/utils/index.ts')).mtimeMs;
  const build = buildDistribution();
  const declarationPath = join(projectRoot, 'dist/utils/pipe/createPipeBuilder.d.ts');
  const publicDeclarationPath = join(projectRoot, 'dist/utils/index.d.ts');
  const pipeTypesDeclarationPath = join(projectRoot, 'dist/utils/pipe/types.d.ts');

  // When
  const validResult = compileTypeFixture('dist-consumer');
  const rootDeclaration = readFileSync(declarationPath, 'utf8');
  const publicDeclaration = readFileSync(publicDeclarationPath, 'utf8');
  const pipeTypeDeclaration = readFileSync(pipeTypesDeclarationPath, 'utf8').match(
    /export type Pipe = \{[\s\S]*?\n\};/,
  )?.[0];

  // Then
  expect(build.exitCode).toBe(0);
  expect(build.diagnostics).toContain('rm -rf dist && tsc');
  expect(statSync(declarationPath).mtimeMs).toBeGreaterThanOrEqual(sourceModifiedAt);
  expect(validResult.success).toBeTrue();
  expect(validResult.diagnostics).toBe('');
  expectInvalidFixture({
    diagnosticCount: 3,
    fixture: 'dist-consumer/public-invalid',
    markers: ['__pipeCallableRootError', '__pipeStoreInputError'],
  });
  expect(rootDeclaration).toContain('export declare const pipe: Pipe;');
  expect(rootDeclaration).not.toContain('declare function pipe');
  expect(pipeTypeDeclaration).toBeDefined();
  expect(pipeTypeDeclaration ?? '').not.toContain('create');
  expect(publicDeclaration).toContain("export { pipe } from './pipe';");
  expect(publicDeclaration).toContain('PipeConfigurationError');
  expect(publicDeclaration).not.toMatch(/\bPipeableMiddleware\b/);
  expect(publicDeclaration).not.toContain('PipeMetadataSnapshot');
  expect(publicDeclaration).not.toContain('validation-types');
}, { timeout: 90_000 });
