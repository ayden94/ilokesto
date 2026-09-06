import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { releaseOrder } from "../../scripts/publish-packages.mjs";

test("the documentation site is a private workspace outside npm releases", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const projects = JSON.parse(
    execFileSync("pnpm", ["list", "-r", "--depth", "-1", "--json"], {
      cwd: root,
      encoding: "utf8",
    }),
  );
  const docs = projects.find((project) => project.name === "@ilokesto/docs");
  assert.ok(docs, "the official docs must be discoverable in the workspace");
  assert.equal(docs.path, `${root}apps/docs`);
  const manifest = JSON.parse(
    await readFile(new URL("../../apps/docs/package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.private, true);
  assert.equal(releaseOrder.includes("docs"), false);
});
