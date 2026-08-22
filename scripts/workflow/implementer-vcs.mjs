import { constants } from 'node:fs';
import { copyFile, readFile, lstat, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CapabilityBoundaryError,
  assertSafeText,
  runGitFile,
  validateWorktreeRuntime,
  withMutationLock,
} from './worktree-boundary.mjs';

const pathMagic = /(^-|^:|(^|\/)\.\.($|\/)|[?*[]|^~|^\$|^\$\{|\\)/u;
const coAuthor = /Co-Authored-By\s*:/iu;
const manifestName = 'ilokesto-implementer-approved-index.json';
const privateIndexName = 'ilokesto-implementer.index';
const shaPattern = /^[0-9a-f]{40}$/u;
const branchRefPattern = /^refs\/heads\/issue-[A-Za-z0-9][A-Za-z0-9._-]*$/u;

export function validateStagePaths(paths) {
  if (paths.length === 0 || paths.length > 100) throw new CapabilityBoundaryError('stage requires 1-100 explicit files');
  return paths.map((path) => {
    assertSafeText(path, 'stage path');
    if (isAbsolute(path) || path === '.' || pathMagic.test(path)) {
      throw new CapabilityBoundaryError('stage path is not an explicit local file');
    }
    return path;
  });
}

export function validateCommitMessage(message) {
  assertSafeText(message, 'commit message');
  if (message.startsWith('-') || coAuthor.test(message)) throw new CapabilityBoundaryError('commit message is forbidden');
  return message;
}

function assignmentFromEnvironment() {
  return {
    branch: assertSafeText(process.env.ILOKESTO_ASSIGNED_BRANCH, 'assigned branch'),
    expectedHead: assertSafeText(process.env.ILOKESTO_ASSIGNED_HEAD, 'assigned head'),
    worktreePath: assertSafeText(process.env.ILOKESTO_ASSIGNED_WORKTREE, 'assigned worktree'),
  };
}

async function validateStageTarget(worktreePath, path) {
  const target = resolve(worktreePath, path);
  const pathFromRoot = relative(worktreePath, target);
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new CapabilityBoundaryError('stage target is outside the worktree');
  }
  let current = worktreePath;
  for (const segment of path.split('/')) {
    current = resolve(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new CapabilityBoundaryError('stage target contains a symlink');
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') break;
      throw error;
    }
  }
  try {
    const stats = await lstat(target);
    if (stats.isDirectory()) throw new CapabilityBoundaryError('bulk directory staging is forbidden');
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
    runGitFile(['ls-files', '--error-unmatch', '--', path], { cwd: worktreePath });
  }
}

function splitNull(output) {
  return output === '' ? [] : output.split('\0').filter((entry) => entry !== '');
}

export function assertApprovedIndex(actual, approved) {
  if (JSON.stringify(actual.paths) !== JSON.stringify(approved.paths)
    || actual.status !== approved.status
    || actual.tree !== approved.tree) {
    throw new CapabilityBoundaryError('index differs from the wrapper-approved stage result');
  }
}

function privateIndexEnvironment(indexPath) {
  return { GIT_INDEX_FILE: indexPath };
}

function readIndexState(worktreePath, indexPath, expectedHead) {
  const options = {
    cwd: worktreePath,
    internalGitEnvironment: privateIndexEnvironment(indexPath),
  };
  const paths = splitNull(runGitFile(
    ['diff', '--cached', '--name-only', '-z', expectedHead, '--'],
    options,
  )).sort();
  return Object.freeze({
    paths,
    status: runGitFile(['diff', '--cached', '--name-status', '-z', expectedHead, '--'], options),
    tree: runGitFile(['write-tree'], options),
  });
}

function assertManifestShape(value, assignment) {
  const keys = ['branch_ref', 'expected_head', 'index_device', 'index_inode', 'paths', 'status', 'tree', 'version'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    throw new CapabilityBoundaryError('approved-index state is invalid');
  }
  if (value.version !== 1
    || value.branch_ref !== `refs/heads/${assignment.branch}`
    || value.expected_head !== assignment.expectedHead
    || !shaPattern.test(value.expected_head)
    || !shaPattern.test(value.tree)
    || !/^[0-9]+$/u.test(value.index_device)
    || !/^[0-9]+$/u.test(value.index_inode)
    || typeof value.status !== 'string'
    || !Array.isArray(value.paths)
    || value.paths.length === 0
    || new Set(value.paths).size !== value.paths.length) {
    throw new CapabilityBoundaryError('approved-index state is invalid');
  }
  validateStagePaths(value.paths);
  return value;
}

async function readApprovedIndex(gitDirectory, assignment) {
  try {
    const parsed = JSON.parse(await readFile(join(gitDirectory, manifestName), 'utf8'));
    return assertManifestShape(parsed, assignment);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) throw new CapabilityBoundaryError('approved-index state is invalid');
    throw error;
  }
}

async function writeApprovedIndex(gitDirectory, state) {
  const path = join(gitDirectory, manifestName);
  const temporaryPath = `${path}.${String(process.pid)}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
  await rename(temporaryPath, path);
}

async function readPrivateIndexIdentity(indexPath, expected) {
  try {
    const stats = await lstat(indexPath, { bigint: true });
    const identity = Object.freeze({
      index_device: String(stats.dev),
      index_inode: String(stats.ino),
    });
    if (!stats.isFile() || stats.nlink !== 1n
      || (expected && (identity.index_device !== expected.index_device || identity.index_inode !== expected.index_inode))) {
      throw new CapabilityBoundaryError('approved private index is invalid');
    }
    return identity;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      throw new CapabilityBoundaryError('approved private index is missing');
    }
    throw error;
  }
}

function assertPrimaryIndexClean(worktreePath, expectedHead) {
  const paths = runGitFile(
    ['diff', '--cached', '--name-only', '-z', expectedHead, '--'],
    { cwd: worktreePath },
  );
  if (paths !== '') throw new CapabilityBoundaryError('primary index must be clean');
}

function validateAtomicRuntime(assignment) {
  validateWorktreeRuntime(assignment);
  const branchRef = runGitFile(['symbolic-ref', '--quiet', 'HEAD'], { cwd: assignment.worktreePath });
  if (branchRef !== `refs/heads/${assignment.branch}`) {
    throw new CapabilityBoundaryError('branch ref does not match the assignment');
  }
  const refHead = runGitFile(['rev-parse', '--verify', branchRef], { cwd: assignment.worktreePath });
  if (refHead !== assignment.expectedHead) throw new CapabilityBoundaryError('assignment head is stale');
  return branchRef;
}

export function updateBranchAtomically(worktreePath, branchRef, newCommit, expectedOldHead) {
  if (!branchRefPattern.test(branchRef)
    || !shaPattern.test(newCommit)
    || !shaPattern.test(expectedOldHead)) {
    throw new CapabilityBoundaryError('atomic ref update is invalid');
  }
  runGitFile(['update-ref', branchRef, newCommit, expectedOldHead], { cwd: worktreePath });
}

function assertOnlyApprovedPaths(state, approvedPaths) {
  const allowed = new Set(approvedPaths);
  if (state.paths.some((path) => !allowed.has(path))) {
    throw new CapabilityBoundaryError('index contains a path not approved by stage');
  }
}

export async function main(argv = process.argv.slice(2)) {
  const [operation, ...args] = argv;
  const assignment = assignmentFromEnvironment();
  assignment.worktreePath = await realpath(assignment.worktreePath);
  if (operation === 'stage') {
    const paths = validateStagePaths(args);
    await withMutationLock(assignment.worktreePath, async ({ gitDirectory }) => {
      await Promise.all(paths.map((path) => validateStageTarget(assignment.worktreePath, path)));
      assertPrimaryIndexClean(assignment.worktreePath, assignment.expectedHead);
      const privateIndex = join(gitDirectory, privateIndexName);
      const approved = await readApprovedIndex(gitDirectory, assignment);
      if (approved) {
        await readPrivateIndexIdentity(privateIndex, approved);
        assertApprovedIndex(readIndexState(assignment.worktreePath, privateIndex, assignment.expectedHead), approved);
      } else {
        try {
          await lstat(privateIndex);
          throw new CapabilityBoundaryError('unbound private index exists');
        } catch (error) {
          if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
        }
        validateAtomicRuntime(assignment);
        runGitFile(['read-tree', assignment.expectedHead], {
          cwd: assignment.worktreePath,
          internalGitEnvironment: privateIndexEnvironment(privateIndex),
        });
      }
      validateAtomicRuntime(assignment);
      runGitFile(['add', '--', ...paths], {
        cwd: assignment.worktreePath,
        internalGitEnvironment: privateIndexEnvironment(privateIndex),
        stdio: 'inherit',
      });
      validateAtomicRuntime(assignment);
      const after = readIndexState(assignment.worktreePath, privateIndex, assignment.expectedHead);
      const indexIdentity = await readPrivateIndexIdentity(privateIndex);
      assertOnlyApprovedPaths(after, [...(approved?.paths ?? []), ...paths]);
      if (after.paths.length === 0) throw new CapabilityBoundaryError('stage produced an empty index');
      await writeApprovedIndex(gitDirectory, {
        branch_ref: `refs/heads/${assignment.branch}`,
        expected_head: assignment.expectedHead,
        ...indexIdentity,
        ...after,
        version: 1,
      });
    });
    return 0;
  }
  if (operation === 'commit' && args.length === 1) {
    const message = validateCommitMessage(args[0]);
    await withMutationLock(assignment.worktreePath, async ({ gitDirectory }) => {
      const approved = await readApprovedIndex(gitDirectory, assignment);
      if (!approved) throw new CapabilityBoundaryError('commit requires wrapper-approved stage state');
      const privateIndex = join(gitDirectory, privateIndexName);
      const primaryIndex = join(gitDirectory, 'index');
      const primaryIndexLock = `${primaryIndex}.lock`;
      await readPrivateIndexIdentity(privateIndex, approved);
      assertPrimaryIndexClean(assignment.worktreePath, assignment.expectedHead);
      assertApprovedIndex(readIndexState(assignment.worktreePath, privateIndex, assignment.expectedHead), approved);
      validateAtomicRuntime(assignment);
      try {
        await copyFile(privateIndex, primaryIndexLock, constants.COPYFILE_EXCL);
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'EEXIST') {
          throw new CapabilityBoundaryError('primary index lock is busy');
        }
        throw error;
      }
      let newCommit;
      let refUpdated = false;
      let committed = false;
      const messagePath = join(gitDirectory, `ilokesto-implementer-commit-message.${String(process.pid)}`);
      try {
        assertPrimaryIndexClean(assignment.worktreePath, assignment.expectedHead);
        assertApprovedIndex(readIndexState(assignment.worktreePath, primaryIndexLock, assignment.expectedHead), approved);
        const branchRef = validateAtomicRuntime(assignment);
        await writeFile(messagePath, `${message}\n`, { flag: 'wx', mode: 0o600 });
        const hookOptions = {
          cwd: assignment.worktreePath,
          internalGitEnvironment: privateIndexEnvironment(primaryIndexLock),
          stdio: 'inherit',
        };
        runGitFile(['hook', 'run', '--ignore-missing', 'pre-commit'], hookOptions);
        runGitFile(['hook', 'run', '--ignore-missing', 'prepare-commit-msg', '--', messagePath, 'message'], hookOptions);
        runGitFile(['hook', 'run', '--ignore-missing', 'commit-msg', '--', messagePath], hookOptions);
        const hookedMessage = validateCommitMessage((await readFile(messagePath, 'utf8')).replace(/\n$/u, ''));
        assertApprovedIndex(readIndexState(assignment.worktreePath, primaryIndexLock, assignment.expectedHead), approved);
        validateAtomicRuntime(assignment);
        newCommit = runGitFile(
          ['commit-tree', approved.tree, '-p', assignment.expectedHead, '-m', hookedMessage],
          { cwd: assignment.worktreePath },
        );
        updateBranchAtomically(assignment.worktreePath, branchRef, newCommit, assignment.expectedHead);
        refUpdated = true;
        await rename(primaryIndexLock, primaryIndex);
        committed = true;
        refUpdated = false;
      } catch (error) {
        if (refUpdated) {
          try {
            updateBranchAtomically(assignment.worktreePath, approved.branch_ref, assignment.expectedHead, newCommit);
          } catch {
            throw new CapabilityBoundaryError('atomic commit finalization and ref rollback failed');
          }
        }
        throw error;
      } finally {
        const cleanup = [
          rm(messagePath, { force: true }),
          rm(primaryIndexLock, { force: true }),
        ];
        if (committed) await Promise.allSettled(cleanup);
        else await Promise.all(cleanup);
      }
      await Promise.allSettled([
        rm(join(gitDirectory, manifestName)),
        rm(privateIndex),
      ]);
      try {
        runGitFile(['hook', 'run', '--ignore-missing', 'post-commit'], { cwd: assignment.worktreePath, stdio: 'inherit' });
      } catch {
        // Git treats post-commit as notification-only; its failure cannot undo a completed commit.
      }
    });
    return 0;
  }
  throw new CapabilityBoundaryError('VCS operation is invalid');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
