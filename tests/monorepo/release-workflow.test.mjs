import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("main pushes run only serialized release automation", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /push:\n\s+branches:\n\s+- main/);
  assert.doesNotMatch(workflow, /pull_request:|workflow_dispatch:/);
  assert.match(workflow, /group: release-main/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /pull-requests: write/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|publish: pnpm release|id-token: write/);
  assert.match(workflow, /id: changesets/);
  assert.match(workflow, /steps\.changesets\.outputs\.pullRequestNumber/);
  assert.match(workflow, /actions\/workflows\/ci\.yml\/dispatches/);
  assert.match(workflow, /expected_head_sha: \$sha/);
  assert.match(workflow, /release_pr_number: \$pr/);
});
