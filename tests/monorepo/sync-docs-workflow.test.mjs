import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('docs sync keeps the optional token guard in step context', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/_sync-docs.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /env:\n\s+DOCS_SYNC_TOKEN: \$\{\{ secrets\.DOCS_SYNC_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /jobs:\n[\s\S]*?if: \$\{\{ secrets\.DOCS_SYNC_TOKEN/u);

  const steps = workflow.split('\n      - name: ').slice(1);
  const guardedStepNames = [
    'Checkout source repository',
    'Checkout docs repository',
    'Set up Git identity',
    'Sync package docs',
    'Create pull request',
  ];
  assert.equal(guardedStepNames.every((name) => steps.some((step) => step.startsWith(name))), true);
  for (const name of guardedStepNames) {
    const step = steps.find((candidate) => candidate.startsWith(name));
    assert.ok(step);
    assert.match(step, /if: \$\{\{ env\.DOCS_SYNC_TOKEN != '' \}\}/);
  }
});
