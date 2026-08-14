import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const releaseOrder = [
  "store",
  "fetcher",
  "utilinent",
  "state",
  "form",
  "overlay",
  "modal",
  "toast",
];

export const getDistTag = (name) =>
  name === "@ilokesto/fetcher" ? "beta" : "latest";

export const getPublishArgs = (name) => [
  "--filter",
  name,
  "publish",
  "--access",
  "public",
  "--tag",
  getDistTag(name),
  "--no-git-checks",
];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
};

const readPackage = async (directory) => {
  const path = new URL(`../packages/${directory}/package.json`, import.meta.url);
  const value = JSON.parse(await readFile(path, "utf8"));

  if (typeof value.name !== "string" || typeof value.version !== "string") {
    throw new Error(`Invalid package manifest: packages/${directory}/package.json`);
  }

  return { name: value.name, version: value.version };
};

const isPublished = ({ name, version }) => {
  const result = run("npm", ["view", `${name}@${version}`, "version", "--json"], {
    capture: true,
  });

  if (result.status === 0) {
    return JSON.parse(result.stdout) === version;
  }

  if (result.stderr.includes("E404")) {
    return false;
  }

  throw new Error(result.stderr.trim() || `npm view failed for ${name}@${version}`);
};

const publishPackage = ({ name, version }, dryRun) => {
  const tag = getDistTag(name);

  if (isPublished({ name, version })) {
    console.log(`skip ${name}@${version}: already published`);
    return;
  }

  console.log(`${dryRun ? "plan" : "publish"} ${name}@${version} with tag ${tag}`);

  if (dryRun) {
    return;
  }

  const tagName = `${name}@${version}`;
  const gitTagResult = run("git", ["tag", tagName]);

  if (gitTagResult.status !== 0) {
    throw new Error(`Tag creation failed for ${tagName}`);
  }

  const publish = run("pnpm", getPublishArgs(name));

  if (publish.status !== 0) {
    throw new Error(`Publishing failed for ${name}@${version}`);
  }
};

export const publishPackages = async ({ dryRun }) => {
  for (const directory of releaseOrder) {
    publishPackage(await readPackage(directory), dryRun);
  }
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await publishPackages({ dryRun: process.argv.includes("--dry-run") });
}
