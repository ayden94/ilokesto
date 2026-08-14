import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

const buildPackage = (name) =>
  spawnSync("pnpm", ["--filter", name, "build"], {
    cwd: root,
    encoding: "utf8",
  });

test("form builds with the workspace dependency graph", () => {
  const result = buildPackage("@ilokesto/form");

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("modal builds against the workspace overlay types", () => {
  const result = buildPackage("@ilokesto/modal");

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
