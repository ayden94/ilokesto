import type { PipeCapabilityChainValidation } from './capability-validation-types';
import type {
  PipeDuplicatePolicy,
  PipeMetadataCapabilities,
  PipeMiddlewareMetadata,
  PipeRelationshipKey,
} from './types';
import type { PipeMetadataChain } from './validation-shared-types';

declare const pipeDiagnosticBrand: unique symbol;

type PipeDiagnostic<Marker extends string, Detail extends object> = {
  readonly [Key in Marker]: Marker;
} & Detail & {
  readonly [pipeDiagnosticBrand]?: Marker;
};

type PipeValidationDetail<Current extends PipeMetadataChain, Next extends PipeMiddlewareMetadata> = {
  readonly current: Current;
  readonly next: Next;
};

export type PipeDuplicateMiddlewareDiagnostic<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeDiagnostic<
  '__pipeDuplicateMiddlewareError',
  PipeValidationDetail<Current, Next>
>;

export type PipeMiddlewareOrderDiagnostic<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeDiagnostic<
  '__pipeMiddlewareOrderError',
  PipeValidationDetail<Current, Next>
>;

export type PipeMiddlewareCycleDiagnostic<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeDiagnostic<
  '__pipeMiddlewareCycleError',
  PipeValidationDetail<Current, Next>
>;

type PipeMetadataId<Metadata extends PipeMiddlewareMetadata> = Metadata['id'];

type PipeMetadataIds<Chain extends PipeMetadataChain> = PipeMetadataId<Chain[number]>;

type PipeRelationshipIds<
  Metadata extends PipeMiddlewareMetadata,
  Key extends PipeRelationshipKey,
> = Metadata[Key] extends readonly string[] ? Metadata[Key][number] : never;

type PipeCapabilityIds<
  Metadata extends PipeMiddlewareMetadata,
  Key extends 'adds' | 'requires',
> = PipeMetadataCapabilities<Metadata, Key>[number]['id'];

type PipeDuplicateValue<Metadata extends PipeMiddlewareMetadata> = Metadata extends {
  readonly duplicate: infer Duplicate extends PipeDuplicatePolicy;
}
  ? Duplicate
  : 'reject';

type PipeMetadataSignature<Metadata extends PipeMiddlewareMetadata> = {
  readonly adds: PipeCapabilityIds<Metadata, 'adds'>;
  readonly after: PipeRelationshipIds<Metadata, 'after'>;
  readonly before: PipeRelationshipIds<Metadata, 'before'>;
  readonly duplicate: PipeDuplicateValue<Metadata>;
  readonly id: PipeMetadataId<Metadata>;
  readonly requires: PipeCapabilityIds<Metadata, 'requires'>;
};

type PipeMetadataWithIdFromUnion<
  Metadata extends PipeMiddlewareMetadata,
  Id extends string,
> = Metadata extends PipeMiddlewareMetadata
  ? Metadata['id'] extends Id
    ? Metadata
    : never
  : never;

type PipeMetadataWithId<
  Chain extends PipeMetadataChain,
  Id extends string,
> = PipeMetadataWithIdFromUnion<Chain[number], Id>;

type PipeHasId<Chain extends PipeMetadataChain, Id extends string> = [
  Extract<PipeMetadataIds<Chain>, Id>,
] extends [never]
  ? false
  : true;

type PipeMetadataEquivalent<
  Left extends PipeMiddlewareMetadata,
  Right extends PipeMiddlewareMetadata,
> = [PipeMetadataSignature<Left>] extends [PipeMetadataSignature<Right>]
  ? [PipeMetadataSignature<Right>] extends [PipeMetadataSignature<Left>]
    ? true
    : false
  : false;

type PipeMetadataAllAllow<Metadata extends PipeMiddlewareMetadata> = Exclude<
  PipeDuplicateValue<Metadata>,
  'allow'
> extends never
  ? true
  : false;

type PipeMetadataAllEquivalentTo<
  Baseline extends PipeMiddlewareMetadata,
  Candidates extends PipeMiddlewareMetadata,
> = false extends (Candidates extends PipeMiddlewareMetadata
  ? PipeMetadataEquivalent<Baseline, Candidates>
  : never)
  ? false
  : true;

type PipeHasDuplicateProblem<Chain extends PipeMetadataChain> =
  Chain extends readonly [
    infer First extends PipeMiddlewareMetadata,
    ...infer Rest extends PipeMetadataChain,
  ]
    ? PipeHasId<Rest, PipeMetadataId<First>> extends true
      ? PipeMetadataAllAllow<PipeMetadataWithId<Chain, PipeMetadataId<First>>> extends true
        ? PipeMetadataAllEquivalentTo<
            First,
            PipeMetadataWithId<Rest, PipeMetadataId<First>>
          > extends true
          ? PipeHasDuplicateProblem<Rest>
          : true
        : true
      : PipeHasDuplicateProblem<Rest>
    : false;

type PipeAfterDependents<
  Metadata extends PipeMiddlewareMetadata,
  Target extends string,
> = Metadata extends PipeMiddlewareMetadata
  ? Target extends PipeRelationshipIds<Metadata, 'after'>
    ? PipeMetadataId<Metadata>
    : never
  : never;

type PipeOutgoingIds<Chain extends PipeMetadataChain, Id extends string> = Extract<
  | PipeRelationshipIds<PipeMetadataWithId<Chain, Id>, 'before'>
  | PipeAfterDependents<Chain[number], Id>,
  PipeMetadataIds<Chain>
>;

type PipeCycleFromTargets<
  Chain extends PipeMetadataChain,
  Targets extends string,
  Seen extends readonly string[],
> = Targets extends string
  ? Targets extends Seen[number]
    ? true
    : PipeHasCycleFrom<Chain, Targets, [...Seen, Targets]>
  : false;

type PipeHasCycleFrom<
  Chain extends PipeMetadataChain,
  Id extends string,
  Seen extends readonly string[],
> = true extends PipeCycleFromTargets<Chain, PipeOutgoingIds<Chain, Id>, Seen>
  ? true
  : false;

type PipeHasCycleForId<Chain extends PipeMetadataChain, Id extends string> = Id extends string
  ? PipeHasCycleFrom<Chain, Id, [Id]>
  : never;

type PipeHasCycle<Chain extends PipeMetadataChain> = true extends PipeHasCycleForId<
  Chain,
  PipeMetadataIds<Chain>
>
  ? true
  : false;

type PipeHasReversedBefore<
  Metadata extends PipeMiddlewareMetadata,
  Previous extends PipeMetadataChain,
> = [Extract<PipeRelationshipIds<Metadata, 'before'>, PipeMetadataIds<Previous>>] extends [never]
  ? false
  : true;

type PipeHasReversedAfter<
  Metadata extends PipeMiddlewareMetadata,
  Previous extends PipeMetadataChain,
> = [PipeAfterDependents<Previous[number], PipeMetadataId<Metadata>>] extends [never]
  ? false
  : true;

type PipeHasOrderProblem<
  Chain extends PipeMetadataChain,
  Previous extends PipeMetadataChain = readonly [],
> = Chain extends readonly [
  infer First extends PipeMiddlewareMetadata,
  ...infer Rest extends PipeMetadataChain,
]
  ? PipeHasReversedBefore<First, Previous> extends true
    ? true
    : PipeHasReversedAfter<First, Previous> extends true
      ? true
      : PipeHasOrderProblem<Rest, [...Previous, First]>
  : false;

export type PipeMiddlewareChainValidation<
  Chain extends PipeMetadataChain,
  Current extends PipeMetadataChain = Chain,
  Next extends PipeMiddlewareMetadata = PipeMiddlewareMetadata,
> = PipeHasDuplicateProblem<Chain> extends true
  ? PipeDuplicateMiddlewareDiagnostic<Current, Next>
  : PipeCapabilityChainValidation<Chain, Current, Next> extends infer CapabilityValidation
    ? unknown extends CapabilityValidation
      ? PipeHasCycle<Chain> extends true
        ? PipeMiddlewareCycleDiagnostic<Current, Next>
        : PipeHasOrderProblem<Chain> extends true
          ? PipeMiddlewareOrderDiagnostic<Current, Next>
          : unknown
      : CapabilityValidation
    : never;

export type PipeMiddlewareAppendValidation<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeMiddlewareChainValidation<[...Current, Next], Current, Next>;

export type {
  PipeDuplicateCapabilityDiagnostic,
  PipeMissingCapabilityDiagnostic,
} from './capability-validation-types';
export type { PipeMetadataChain } from './validation-shared-types';
