import type { PipeCapability, PipeMetadataCapabilities, PipeMiddlewareMetadata } from './types';
import type { PipeMetadataChain } from './validation-shared-types';

declare const pipeCapabilityDiagnosticBrand: unique symbol;

type PipeCapabilityValidationDetail<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = {
  readonly current: Current;
  readonly next: Next;
};

type PipeCapabilityDiagnostic<Marker extends string, Detail extends object> = {
  readonly [Key in Marker]: Marker;
} & Detail & {
  readonly [pipeCapabilityDiagnosticBrand]?: Marker;
};

export type PipeDuplicateCapabilityDiagnostic<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeCapabilityDiagnostic<
  '__pipeDuplicateCapabilityError',
  PipeCapabilityValidationDetail<Current, Next>
>;

export type PipeMissingCapabilityDiagnostic<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeCapabilityDiagnostic<
  '__pipeMissingCapabilityError',
  PipeCapabilityValidationDetail<Current, Next>
>;

type PipeCapabilityIds<
  Metadata extends PipeMiddlewareMetadata,
  Key extends 'adds' | 'requires',
> = PipeMetadataCapabilities<Metadata, Key>[number]['id'];

type PipeHasDuplicateCapabilityIds<
  Capabilities extends readonly PipeCapability[],
  Seen extends string,
> = Capabilities extends readonly [
  infer First extends PipeCapability,
  ...infer Rest extends readonly PipeCapability[],
]
  ? First['id'] extends Seen
    ? true
    : PipeHasDuplicateCapabilityIds<Rest, Seen | First['id']>
  : false;

type PipeHasDuplicateCapabilityProblem<
  Chain extends PipeMetadataChain,
  Seen extends string = never,
> = Chain extends readonly [
  infer First extends PipeMiddlewareMetadata,
  ...infer Rest extends PipeMetadataChain,
]
  ? PipeHasDuplicateCapabilityIds<PipeMetadataCapabilities<First, 'adds'>, Seen> extends true
    ? true
    : PipeHasDuplicateCapabilityProblem<Rest, Seen | PipeCapabilityIds<First, 'adds'>>
  : false;

type PipeHasMissingCapabilityProblem<
  Chain extends PipeMetadataChain,
  Available extends string = never,
> = Chain extends readonly [
  infer First extends PipeMiddlewareMetadata,
  ...infer Rest extends PipeMetadataChain,
]
  ? Exclude<PipeCapabilityIds<First, 'requires'>, Available> extends never
    ? PipeHasMissingCapabilityProblem<Rest, Available | PipeCapabilityIds<First, 'adds'>>
    : true
  : false;

export type PipeCapabilityChainValidation<
  Chain extends PipeMetadataChain,
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeHasDuplicateCapabilityProblem<Chain> extends true
  ? PipeDuplicateCapabilityDiagnostic<Current, Next>
  : PipeHasMissingCapabilityProblem<Chain> extends true
    ? PipeMissingCapabilityDiagnostic<Current, Next>
    : unknown;
