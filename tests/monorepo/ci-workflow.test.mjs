import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readWorkflow = (name) =>
  readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

test("verification is read-only and runs only for PRs or guarded dispatches", async () => {
  const workflow = await readWorkflow("ci.yml");

  assert.match(workflow, /pull_request:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:\n\s+inputs:/);
  assert.match(workflow, /expected_head_sha:[\s\S]*required: true/);
  assert.match(workflow, /release_pr_number:[\s\S]*required: true/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+pull-requests: read/);
  assert.doesNotMatch(workflow, /contents: write|actions: write|id-token: write/);
  assert.match(workflow, /name: verify/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/changeset-release\/main'/);
});

test("release dispatch validation precedes checkout and binds the exact PR head", async () => {
  const workflow = await readWorkflow("ci.yml");
  const validation = workflow.indexOf("name: Validate release dispatch");
  const checkout = workflow.indexOf("name: Checkout repository");

  assert.ok(validation >= 0);
  assert.ok(checkout > validation);
  assert.match(workflow, /GITHUB_SHA.*EXPECTED_HEAD_SHA/);
  assert.match(workflow, /\.base\.ref, \.head\.ref, \.head\.repo\.full_name, \.head\.sha/);
  assert.match(workflow, /git\/ref\/heads\/changeset-release\/main/);
  assert.match(workflow, /ref: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.expected_head_sha \|\| github\.sha \}\}/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /persist-credentials: false/);
});

test("changeset status receives a local main base ref", async () => {
  const workflow = await readWorkflow("ci.yml");
  const prepareBase = workflow.indexOf("name: Prepare changeset base branch");
  const changesetStatus = workflow.indexOf("name: Check changesets");

  assert.ok(prepareBase >= 0);
  assert.ok(changesetStatus > prepareBase);
  assert.match(workflow, /git branch --force main origin\/main/);
});

test("changeset status is required only for ordinary pull requests", async () => {
  const workflow = await readWorkflow("ci.yml");

  assert.match(
    workflow,
    /- name: Check changesets\n\s+if: github\.event_name == 'pull_request'\n\s+run: pnpm changeset:status/,
  );
});
