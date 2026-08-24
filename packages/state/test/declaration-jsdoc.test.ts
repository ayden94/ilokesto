import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

type PublicDeclaration = Readonly<{
  readonly exportName: string;
  readonly relativePath: string;
}>;

const projectRoot = join(import.meta.dir, '..');
const publicDeclarations = [
  { exportName: 'create', relativePath: 'dist/core/React/index.d.ts' },
  { exportName: 'throttle', relativePath: 'dist/middleware/throttle.d.ts' },
  { exportName: 'adaptor', relativePath: 'dist/utils/adaptor.d.ts' },
] as const satisfies readonly PublicDeclaration[];

test('Given a fresh state build, When public declarations are emitted, Then framework and middleware utility exports retain JSDoc', () => {
  // Given
  const build = Bun.spawnSync({
    cmd: ['pnpm', 'build'],
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  // When
  expect(build.exitCode).toBe(0);
  const declarations = publicDeclarations.map((declaration) => {
    const declarationPath = join(projectRoot, declaration.relativePath);
    const sourceFile = ts.createSourceFile(
      declarationPath,
      readFileSync(declarationPath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const functions = sourceFile.statements.filter(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === declaration.exportName &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true,
    );

    if (functions.length === 0) {
      throw new Error(`Missing exported declaration: ${declaration.relativePath}#${declaration.exportName}`);
    }

    return functions;
  });

  // Then
  for (const declarationsForExport of declarations) {
    expect(
      declarationsForExport.some(
        (declaration) => ts.getJSDocCommentsAndTags(declaration).length > 0,
      ),
    ).toBeTrue();
  }
}, { timeout: 180_000 });
