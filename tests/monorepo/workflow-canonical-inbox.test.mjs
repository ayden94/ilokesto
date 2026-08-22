import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readCanonicalInboxText } from '../../scripts/workflow/canonical-inbox.mjs';

function workspace(context) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'ilokesto-canonical-inbox-')));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.omo', 'inbox'), { recursive: true });
  return root;
}

function assertIdentityError(error) {
  return error?.code === 'ERR_PATH_SYMLINK' || error?.code === 'ERR_INVALID_TARGET_TYPE';
}

test('canonical inbox read rejects target replacement after path validation', (context) => {
  const root = workspace(context);
  const target = join(root, '.omo', 'inbox', 'receipt.json');
  writeFileSync(target, '{"trusted":true}');

  assert.throws(
    () => readCanonicalInboxText(root, '.omo/inbox/receipt.json', {
      beforeOpen() {
        renameSync(target, `${target}.validated`);
        writeFileSync(target, '{"hostile":true}');
      },
    }),
    assertIdentityError,
  );
});

test('canonical inbox read rejects parent replacement after path validation', (context) => {
  const root = workspace(context);
  const inbox = join(root, '.omo', 'inbox');
  writeFileSync(join(inbox, 'receipt.json'), '{"trusted":true}');

  assert.throws(
    () => readCanonicalInboxText(root, '.omo/inbox/receipt.json', {
      beforeOpen() {
        renameSync(inbox, `${inbox}.validated`);
        mkdirSync(inbox);
        writeFileSync(join(inbox, 'receipt.json'), '{"hostile":true}');
      },
    }),
    assertIdentityError,
  );
});

test('canonical inbox read remains bound to the opened descriptor', (context) => {
  const root = workspace(context);
  const target = join(root, '.omo', 'inbox', 'receipt.json');
  writeFileSync(target, '{"trusted":true}');
  let replaced = false;

  const source = readCanonicalInboxText(root, '.omo/inbox/receipt.json', {
    afterOpen() {
      renameSync(target, `${target}.opened`);
      writeFileSync(target, '{"hostile":true}');
      replaced = true;
    },
  });

  assert.equal(replaced, true);
  assert.equal(source, '{"trusted":true}');
});
