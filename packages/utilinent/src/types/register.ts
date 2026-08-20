import { RegistryCategory } from "./RegistryCategory";

/**
 * Module augmentation interface for registering custom plugin component types.
 *
 * Consumers declare components via `declare module '@ilokesto/utilinent'`
 * to get type-safe access on proxy components (e.g. `Show.Link`).
 */
export interface UtilinentRegister {
}

/**
 * Extracts the registered component types for a given category from {@link UtilinentRegister}.
 */
export type RegisterProps<T extends RegistryCategory> = UtilinentRegister extends { [X in T]: infer Props } ? Props : never;
