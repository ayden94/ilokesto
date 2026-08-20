import { HtmlTag } from "../constants/htmlTags";
import { RegisterProps } from "./register";
import { RegistryCategory } from "./RegistryCategory";

/**
 * Base type for proxy type helpers. Carries `props` and `type` phantom fields
 * used by {@link ProxyType} for generic component-type inference.
 */
export interface BaseTypeHelperFn {
  props: unknown;
  type: unknown;
}

type Apply<F extends BaseTypeHelperFn, Props> = (F & { props: Props })["type"];

type MaybeOmitChildren<Props, OmitChildren extends boolean> = OmitChildren extends true
  ? Omit<Props, "children">
  : Props;

/**
 * Resolves the component type for a given tag key `K`, applying the proxy's
 * type helper `F`. HTML tags and registered component types are supported;
 * `children` is omitted from the resulting props by default.
 */
export type TagHelper<K, F extends BaseTypeHelperFn, OmitChildren extends boolean = true> = K extends keyof HtmlTag
  ? Apply<F, MaybeOmitChildren<React.ComponentPropsWithRef<K>, OmitChildren>>
  : K extends React.ComponentType<infer P>
    ? Apply<F, MaybeOmitChildren<P, OmitChildren>>
    : K;

/**
 * Computes the full polymorphic type of a proxy component.
 *
 * Includes the base component type, typed HTML tag variants from {@link HtmlTag},
 * and plugin-registered component variants from {@link RegisterProps}.
 */
export type ProxyType<
  F extends BaseTypeHelperFn,
  RegisterKey extends RegistryCategory,
  OmitChildren extends boolean = true
> = Apply<F, object> & {
  [K in keyof HtmlTag]: TagHelper<K, F, OmitChildren>;
} & {
  [K in keyof RegisterProps<RegisterKey>]: TagHelper<RegisterProps<RegisterKey>[K], F, OmitChildren>;
} & {
  [K in keyof RegisterProps<"base">]: TagHelper<RegisterProps<"base">[K], F, OmitChildren>;
};