import {
  forwardRef,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { Mount } from "../../src/index";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
        (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;

type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<Condition extends true> = Condition;
type NonPromiseNode<Node> = Node extends PromiseLike<unknown> ? never : Node;

type MountChildren = Parameters<typeof Mount>[0]["children"];
type ExpectedMountNode = NonPromiseNode<ReactNode>;
type ExpectedMountChildren =
  | ExpectedMountNode
  | (() => ReactNode | Promise<ReactNode>);

type MountChildrenRemainExact = Assert<Equal<MountChildren, ExpectedMountChildren>>;
type DirectNodeIsAccepted = Assert<IsAssignable<ReactNode, MountChildren>>;
type SyncFactoryIsAccepted = Assert<IsAssignable<() => ReactNode, MountChildren>>;
type AsyncFactoryIsAccepted = Assert<
  IsAssignable<() => Promise<ReactNode>, MountChildren>
>;
type DirectElementPromiseIsRejected = Assert<
  Equal<IsAssignable<Promise<ReactElement>, MountChildren>, false>
>;
type DirectStringPromiseIsRejected = Assert<
  Equal<IsAssignable<Promise<string>, MountChildren>, false>
>;
type DirectPromiseLikeValuesAreExcluded = Assert<
  Equal<Extract<MountChildren, PromiseLike<unknown>>, never>
>;

type DivProps = Parameters<typeof Mount.div>[0];
type DivHostPropsAreAccepted = Assert<
  IsAssignable<
    {
      readonly children: ReactNode;
      readonly className: string;
      readonly "aria-label": string;
      readonly ref: RefObject<HTMLDivElement>;
    },
    DivProps
  >
>;
type DivRefIsConcrete = Assert<Equal<ComponentRef<typeof Mount.div>, HTMLDivElement>>;

type ButtonProps = Parameters<typeof Mount.button>[0];
type ButtonSpecificPropsAreAccepted = Assert<
  IsAssignable<
    {
      readonly children: ReactNode;
      readonly type: "submit";
      readonly ref: RefObject<HTMLButtonElement>;
    },
    ButtonProps
  >
>;
type ButtonRejectsWrongRef = Assert<
  Equal<
    IsAssignable<
      {
        readonly children: ReactNode;
        readonly ref: RefObject<HTMLAnchorElement>;
      },
      ButtonProps
    >,
    false
  >
>;

type CustomTargetProps = {
  readonly children?: ReactNode;
  readonly destination: string;
};

const CustomTarget = forwardRef<HTMLAnchorElement, CustomTargetProps>(function CustomTarget(
  { children, destination },
  ref,
) {
  return (
    <a ref={ref} href={destination}>
      {children}
    </a>
  );
});

declare module "../../src/types/register" {
  interface UtilinentRegister {
    readonly mount: {
      readonly CustomTarget: typeof CustomTarget;
    };
  }
}

type CustomMountProps = Parameters<typeof Mount.CustomTarget>[0];
type CustomMountPropsAreAccepted = Assert<
  IsAssignable<
    {
      readonly children: () => Promise<ReactNode>;
      readonly destination: string;
      readonly ref: RefObject<HTMLAnchorElement>;
    },
    CustomMountProps
  >
>;
type CustomMountRefIsConcrete = Assert<
  Equal<ComponentRef<typeof Mount.CustomTarget>, HTMLAnchorElement>
>;

export type MountTypeContract =
  | MountChildrenRemainExact
  | DirectNodeIsAccepted
  | SyncFactoryIsAccepted
  | AsyncFactoryIsAccepted
  | DirectElementPromiseIsRejected
  | DirectStringPromiseIsRejected
  | DirectPromiseLikeValuesAreExcluded
  | DivHostPropsAreAccepted
  | DivRefIsConcrete
  | ButtonSpecificPropsAreAccepted
  | ButtonRejectsWrongRef
  | CustomMountPropsAreAccepted
  | CustomMountRefIsConcrete;
