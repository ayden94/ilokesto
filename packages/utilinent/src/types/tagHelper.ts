import { HtmlTag } from "../constants/htmlTags";
import { RegisterProps } from "./register";
import { RegistryCategory } from "./RegistryCategory";

export interface BaseTypeHelperFn {
  props: unknown;
  type: unknown;
}

type Apply<F extends BaseTypeHelperFn, Props> = (F & { props: Props })["type"];

type MaybeOmitChildren<Props, OmitChildren extends boolean> = OmitChildren extends true
  ? Omit<Props, "children">
  : Props;

export type TagHelper<K, F extends BaseTypeHelperFn, OmitChildren extends boolean = true> = K extends keyof HtmlTag
  ? Apply<F, MaybeOmitChildren<React.ComponentPropsWithRef<K>, OmitChildren>>
  : K extends React.ComponentType<infer P>
    ? Apply<F, MaybeOmitChildren<P, OmitChildren>>
    : K;

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