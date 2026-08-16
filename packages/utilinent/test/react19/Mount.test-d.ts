import type { ReactElement, ReactNode } from "react";
import { Mount } from "@ilokesto/utilinent";

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

type MountChildren = Parameters<typeof Mount>[0]["children"];
type React19IncludesElementPromise = Assert<
  IsAssignable<Promise<ReactElement>, ReactNode>
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
type AsyncElementFactoryIsAccepted = Assert<
  IsAssignable<() => Promise<ReactElement>, MountChildren>
>;
type AsyncNodeFactoryIsAccepted = Assert<
  IsAssignable<() => Promise<ReactNode>, MountChildren>
>;
type AsyncStringFactoryIsAccepted = Assert<
  IsAssignable<() => Promise<string>, MountChildren>
>;

export type MountReact19TypeContract =
  | React19IncludesElementPromise
  | DirectElementPromiseIsRejected
  | DirectStringPromiseIsRejected
  | DirectPromiseLikeValuesAreExcluded
  | AsyncElementFactoryIsAccepted
  | AsyncNodeFactoryIsAccepted
  | AsyncStringFactoryIsAccepted;
