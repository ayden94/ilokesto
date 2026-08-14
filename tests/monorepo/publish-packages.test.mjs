import assert from "node:assert/strict";
import test from "node:test";
import {
  getDistTag,
  getPublishArgs,
  releasePackages,
  releaseOrder,
} from "../../scripts/publish-packages.mjs";

const packageInfo = {
  name: "@ilokesto/store",
  version: "1.1.3",
};

test("fetcher uses the beta distribution tag", () => {
  assert.equal(getDistTag("@ilokesto/fetcher"), "beta");
});

test("stable packages use the latest distribution tag", () => {
  assert.equal(getDistTag("@ilokesto/store"), "latest");
});

test("fetcher publish command carries only the beta distribution tag", () => {
  assert.deepEqual(getPublishArgs("@ilokesto/fetcher"), [
    "--filter",
    "@ilokesto/fetcher",
    "publish",
    "--access",
    "public",
    "--tag",
    "beta",
    "--no-git-checks",
  ]);
});

test("packages publish in internal dependency order", () => {
  assert.deepEqual(releaseOrder, [
    "store",
    "fetcher",
    "utilinent",
    "state",
    "form",
    "overlay",
    "modal",
    "toast",
  ]);
});

test("a publish failure creates no tags", async () => {
  const events = [];

  await assert.rejects(() =>
    releasePackages({
      packages: [packageInfo],
      dryRun: false,
      checkPublished: () => false,
      publish: () => {
        events.push("publish");
        throw new Error("registry unavailable");
      },
      tag: () => events.push("tag"),
    }),
  );

  assert.deepEqual(events, ["publish"]);
});

test("successful publishes are tagged after every package", async () => {
  const events = [];

  await releasePackages({
    packages: [packageInfo, { name: "@ilokesto/form", version: "1.0.4" }],
    dryRun: false,
    checkPublished: () => false,
    publish: ({ name }) => events.push(`publish:${name}`),
    tag: () => events.push("tag"),
  });

  assert.deepEqual(events, [
    "publish:@ilokesto/store",
    "publish:@ilokesto/form",
    "tag",
  ]);
});

test("a retry skips published packages and reconciles tags", async () => {
  const events = [];

  await releasePackages({
    packages: [packageInfo],
    dryRun: false,
    checkPublished: () => true,
    publish: () => events.push("publish"),
    tag: () => events.push("tag"),
  });

  assert.deepEqual(events, ["tag"]);
});

test("dry-run performs neither publishing nor tagging", async () => {
  const events = [];

  await releasePackages({
    packages: [packageInfo],
    dryRun: true,
    checkPublished: () => false,
    publish: () => events.push("publish"),
    tag: () => events.push("tag"),
  });

  assert.deepEqual(events, []);
});
