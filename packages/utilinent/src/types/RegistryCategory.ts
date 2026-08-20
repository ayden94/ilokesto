export const REGISTRY_CATEGORIES = [
  "show",
  "for",
  "repeat",
  "mount",
  "switch",
  "base",
] as const;

export type RegistryCategory =
  | (typeof REGISTRY_CATEGORIES)[number]
  | (string & {});