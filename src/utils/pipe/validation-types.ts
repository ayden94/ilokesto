import type { PipeCapabilityChainValidation } from './capability-validation-types';
import type {
  PipeConflictForChain,
  PipeDuplicateMiddlewareDiagnostic,
  PipeHasDuplicateProblem,
} from './metadata-validation-types';
import type {
  PipeHasCycle,
  PipeHasOrderProblem,
  PipeMiddlewareCycleDiagnostic,
  PipeMiddlewareOrderDiagnostic,
} from './relationship-validation-types';
import type { PipeMiddlewareMetadata } from './metadata-types';
import type { PipeMetadataChain } from './validation-shared-types';

export type PipeMiddlewareChainValidation<
  Chain extends PipeMetadataChain,
  Current extends PipeMetadataChain = Chain,
  Next extends PipeMiddlewareMetadata = PipeMiddlewareMetadata,
> = PipeHasDuplicateProblem<Chain> extends true
  ? PipeDuplicateMiddlewareDiagnostic<Current, Next>
  : [PipeConflictForChain<Chain>] extends [never]
    ? PipeCapabilityChainValidation<Chain, Current, Next> extends infer CapabilityValidation
      ? unknown extends CapabilityValidation
        ? PipeHasCycle<Chain> extends true
          ? PipeMiddlewareCycleDiagnostic<Current, Next>
          : PipeHasOrderProblem<Chain> extends true
            ? PipeMiddlewareOrderDiagnostic<Current, Next>
            : unknown
        : CapabilityValidation
      : never
    : PipeConflictForChain<Chain>;

export type PipeMiddlewareAppendValidation<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = PipeMiddlewareChainValidation<[...Current, Next], Current, Next>;

export type {
  PipeDuplicateCapabilityDiagnostic,
  PipeMissingCapabilityDiagnostic,
} from './capability-validation-types';
export type {
  PipeDuplicateMiddlewareDiagnostic,
  PipeMiddlewareConflictDiagnostic,
} from './metadata-validation-types';
export type {
  PipeMiddlewareCycleDiagnostic,
  PipeMiddlewareOrderDiagnostic,
} from './relationship-validation-types';
export type { PipeMetadataChain } from './validation-shared-types';
