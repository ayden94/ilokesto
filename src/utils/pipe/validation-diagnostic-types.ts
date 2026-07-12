import type { PipeMiddlewareMetadata } from './metadata-types';
import type { PipeMetadataChain } from './validation-shared-types';

declare const pipeDiagnosticBrand: unique symbol;

export type PipeDiagnostic<Marker extends string, Detail extends object> = {
  readonly [Key in Marker]: Marker;
} & Detail & {
  readonly [pipeDiagnosticBrand]?: Marker;
};

export type PipeValidationDetail<
  Current extends PipeMetadataChain,
  Next extends PipeMiddlewareMetadata,
> = {
  readonly current: Current;
  readonly next: Next;
};
