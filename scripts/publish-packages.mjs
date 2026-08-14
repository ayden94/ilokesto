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

const publishPackage = ({ name, version }) => {
  const publish = run("pnpm", getPublishArgs(name));

  if (publish.status !== 0) {
    throw new Error(`Publishing failed for ${name}@${version}`);
  }
};

const tagPackages = () => {
  const result = run("pnpm", ["exec", "changeset", "tag"]);

  if (result.status !== 0) {
    throw new Error("Changesets tag creation failed");
  }
};

export const releasePackages = async ({
  packages,
  dryRun,
  checkPublished,
  publish,
  tag,
}) => {
  for (const packageInfo of packages) {
    if (await checkPublished(packageInfo)) {
      console.log(`skip ${packageInfo.name}@${packageInfo.version}: already published`);
      continue;
    }

    console.log(
      `${dryRun ? "plan" : "publish"} ${packageInfo.name}@${packageInfo.version} with tag ${getDistTag(packageInfo.name)}`,
    );

    if (!dryRun) {
      await publish(packageInfo);
    }
  }

  if (!dryRun) {
    await tag();
  }
};

export const publishPackages = async ({ dryRun }) => {
  const packages = await Promise.all(releaseOrder.map(readPackage));

  await releasePackages({
    packages,
    dryRun,
    checkPublished: isPublished,
    publish: publishPackage,
    tag: tagPackages,
  });
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await publishPackages({ dryRun: process.argv.includes("--dry-run") });
}
