import type { PipeMiddlewareMetadata } from './metadata-types';

declare const pipeMiddlewareMetadataBrand: unique symbol;

export type PipeableMiddleware<
  Middleware extends object,
  Metadata extends PipeMiddlewareMetadata,
  StateMismatchKind extends 'pipe' | 'persist-decoder' = 'pipe',
> = Middleware & {
  readonly [pipeMiddlewareMetadataBrand]: Metadata & {
    readonly conflicts: NonNullable<Metadata['conflicts']>;
  };
  readonly [pipeStateMismatchKindBrand]: StateMismatchKind;
};

declare const pipeStateMismatchKindBrand: unique symbol;
