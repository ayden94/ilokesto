/**
 * Default plugin categories. Adding a category here automatically updates
 * both the {@link RegistryCategory} type and {@link PluginManager} initialization.
 */
export const REGISTRY_CATEGORIES = [
  "show",
  "for",
  "repeat",
  "mount",
  "switch",
  "base",
] as const;

/**
 * Plugin registry category. Extensible via `string & {}` for custom categories
 * registered through {@link PluginManager}.
 */
export type RegistryCategory =
  | (typeof REGISTRY_CATEGORIES)[number]
  | (string & {});