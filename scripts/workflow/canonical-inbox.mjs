import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { LaneLedgerError } from './lane-ledger.mjs';

const inboxPathPattern = /^\.omo\/inbox\/[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function fail(code, message, options) {
  throw new LaneLedgerError(code, message, options);
}

function inspectCanonicalInboxFile(workspace, relativePath) {
  if (typeof relativePath !== 'string' || isAbsolute(relativePath) || !inboxPathPattern.test(relativePath)) {
    fail('ERR_PATH_OUTSIDE_ROOT', 'input must be one direct .omo/inbox file');
  }
  const canonicalWorkspace = realpathSync(workspace);
  const inboxPath = resolve(canonicalWorkspace, '.omo', 'inbox');
  const targetPath = resolve(canonicalWorkspace, relativePath);
  if (dirname(targetPath) !== inboxPath || relative(inboxPath, targetPath).includes(sep)) {
    fail('ERR_PATH_OUTSIDE_ROOT', 'input must stay directly beneath .omo/inbox');
  }
  let current = canonicalWorkspace;
  const bindings = [];
  for (const segment of relativePath.split('/')) {
    current = join(current, segment);
    let stats;
    try {
      stats = lstatSync(current, { bigint: true });
    } catch (cause) {
      fail('ERR_INVALID_TARGET_TYPE', 'input path cannot be inspected', { cause });
    }
    if (stats.isSymbolicLink()) fail('ERR_PATH_SYMLINK', 'input path contains a symlink');
    if (current !== targetPath && !stats.isDirectory()) fail('ERR_INVALID_TARGET_TYPE', 'input parent must be a directory');
    if (current === targetPath && (!stats.isFile() || stats.nlink !== 1n)) fail('ERR_INVALID_TARGET_TYPE', 'input must be a single-link regular file');
    bindings.push({ path: current, stats, isTarget: current === targetPath });
  }
  if (realpathSync(targetPath) !== targetPath) fail('ERR_PATH_SYMLINK', 'input path is not canonical');
  return { bindings, targetPath };
}

function revalidateBindings(bindings) {
  for (const binding of bindings) {
    let current;
    try {
      current = lstatSync(binding.path, { bigint: true });
    } catch (cause) {
      fail('ERR_INVALID_TARGET_TYPE', 'input path identity changed', { cause });
    }
    if (current.isSymbolicLink()) fail('ERR_PATH_SYMLINK', 'input path became a symlink');
    const expectedType = binding.isTarget ? current.isFile() : current.isDirectory();
    const sameIdentity = current.dev === binding.stats.dev && current.ino === binding.stats.ino;
    const validLinks = !binding.isTarget || current.nlink === binding.stats.nlink;
    if (!expectedType || !sameIdentity || !validLinks) fail('ERR_INVALID_TARGET_TYPE', 'input path identity changed');
  }
}

function descriptorMatchesTarget(stats, expected) {
  return stats.isFile()
    && stats.dev === expected.dev
    && stats.ino === expected.ino
    && stats.nlink === expected.nlink;
}

export function resolveCanonicalInboxFile(workspace, relativePath) {
  return inspectCanonicalInboxFile(workspace, relativePath).targetPath;
}

export function readCanonicalInboxText(workspace, relativePath, hooks = {}) {
  const inspected = inspectCanonicalInboxFile(workspace, relativePath);
  hooks.beforeOpen?.();
  revalidateBindings(inspected.bindings);
  let descriptor;
  try {
    descriptor = openSync(inspected.targetPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (cause) {
    if (cause?.code === 'ELOOP') fail('ERR_PATH_SYMLINK', 'input path became a symlink', { cause });
    fail('ERR_INVALID_TARGET_TYPE', 'input path cannot be opened', { cause });
  }
  try {
    const target = inspected.bindings.at(-1).stats;
    const opened = fstatSync(descriptor, { bigint: true });
    if (!descriptorMatchesTarget(opened, target)) fail('ERR_INVALID_TARGET_TYPE', 'opened input identity changed');
    hooks.afterOpen?.();
    return readFileSync(descriptor, 'utf8');
  } finally {
    closeSync(descriptor);
  }
}

export function readCanonicalInboxJson(workspace, relativePath) {
  const source = readCanonicalInboxText(workspace, relativePath);
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    fail('ERR_INVALID_RECEIPT', 'input file does not contain valid JSON', { cause });
  }
  if (JSON.stringify(parsed) !== source) fail('ERR_INVALID_RECEIPT', 'input file must contain canonical compact JSON');
  return parsed;
}
