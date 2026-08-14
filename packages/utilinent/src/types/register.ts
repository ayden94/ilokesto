import { RegistryCategory } from "./RegistryCategory";

export interface UtilinentRegister {
}

export type RegisterProps<T extends RegistryCategory> = UtilinentRegister extends { [X in T]: infer Props } ? Props : never;
