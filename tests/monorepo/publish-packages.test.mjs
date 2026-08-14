import assert from "node:assert/strict";
import test from "node:test";
import {
  getDistTag,
  getPublishArgs,
  releaseOrder,
} from "../../scripts/publish-packages.mjs";

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
