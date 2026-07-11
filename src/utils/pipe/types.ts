import type { Store } from '@ilokesto/store';
import type { PipeableMiddleware } from './metadata';
import type { PipeMiddlewareAppendValidation } from './validation-types';

export type PipeDuplicatePolicy = 'allow' | 'reject';

export const pipeRelationshipKeys = ['after', 'before'] as const;

export type PipeRelationshipKey = (typeof pipeRelationshipKeys)[number];

declare const pipeCapabilityBrand: unique symbol;

export type PipeCapability<Id extends string = string, Shape extends object = object> = {
  readonly id: Id;
  readonly shape: Shape;
  readonly [pipeCapabilityBrand]?: Id;
};

export type PipeMiddlewareMetadata<
  Id extends string = string,
  Requires extends readonly PipeCapability[] = readonly PipeCapability[],
  Adds extends readonly PipeCapability[] = readonly PipeCapability[],
  Duplicate extends PipeDuplicatePolicy = PipeDuplicatePolicy,
> = {
  readonly adds?: Adds;
  readonly after?: readonly string[];
  readonly before?: readonly string[];
  readonly duplicate?: Duplicate;
  readonly id: Id;
  readonly requires?: Requires;
};

type PipeCapabilityShape<Capability extends PipeCapability> = Capability['shape'];

export type PipeCapabilityShapes<Capabilities extends readonly PipeCapability[]> =
  Capabilities extends readonly [
    infer First extends PipeCapability,
    ...infer Rest extends readonly PipeCapability[],
  ]
    ? PipeCapabilityShape<First> & PipeCapabilityShapes<Rest>
    : object;

export type PipeMetadataCapabilities<
  Metadata extends PipeMiddlewareMetadata,
  Key extends 'adds' | 'requires',
> = [Extract<Metadata[Key], readonly PipeCapability[]>] extends [never]
  ? readonly []
  : Extract<Metadata[Key], readonly PipeCapability[]>;

export type PipeCapabilitiesAfterAppend<
  Current extends readonly PipeCapability[],
  Next extends PipeMiddlewareMetadata,
> = [...Current, ...PipeMetadataCapabilities<Next, 'adds'>];

type PipeMetadataFor<Middleware> = Middleware extends PipeableMiddleware<
  object,
  infer Metadata extends PipeMiddlewareMetadata
>
  ? Metadata
  : never;

export type PipeRegisteredMetadataFor<Middleware> = Extract<
  PipeMetadataFor<Middleware>,
  PipeMiddlewareMetadata
>;

export type PipeMiddlewareValidationFor<
  MetadataChain extends readonly PipeMiddlewareMetadata[],
  Middleware,
> = Middleware extends PipeableMiddleware<object, PipeMiddlewareMetadata>
  ? PipeMiddlewareAppendValidation<MetadataChain, PipeRegisteredMetadataFor<Middleware>>
  : {
      readonly __pipeUntaggedMiddlewareError: '__pipeUntaggedMiddlewareError';
      readonly middleware: Middleware;
      readonly [pipeUntaggedMiddlewareDiagnosticBrand]?: '__pipeUntaggedMiddlewareError';
    };

declare const pipeUntaggedMiddlewareDiagnosticBrand: unique symbol;

export type PipeNextState<Current, Middleware> = Middleware extends PipeableMiddleware<
  PipeAnyMiddleware<infer Requires, infer Adds>,
  PipeMiddlewareMetadata
>
  ? [Requires, Adds] extends [readonly PipeCapability[], readonly PipeCapability[]]
    ? Current
    : never
  : Middleware extends PipeableMiddleware<
        PipeMiddleware<infer Next, infer Requires, infer Adds>,
        PipeMiddlewareMetadata
      >
    ? [Requires, Adds] extends [readonly PipeCapability[], readonly PipeCapability[]]
      ? PipeResolvedState<Current, Next>
      : never
    : never;

export type PipeStateAppendValidationFor<Current, Middleware> = Middleware extends PipeableMiddleware<
  PipeAnyMiddleware<infer Requires, infer Adds>,
  PipeMiddlewareMetadata
>
  ? [Requires, Adds] extends [readonly PipeCapability[], readonly PipeCapability[]]
    ? unknown
    : never
  : Middleware extends PipeableMiddleware<
        PipeMiddleware<infer Next, infer Requires, infer Adds>,
        PipeMiddlewareMetadata
      >
    ? [Requires, Adds] extends [readonly PipeCapability[], readonly PipeCapability[]]
      ? PipeStateAppendValidation<Current, Next>
      : never
    : never;

export type PipeMiddleware<
  State,
  Requires extends readonly PipeCapability[] = readonly [],
  Adds extends readonly PipeCapability[] = readonly [],
> = (
  store: Store<State> & PipeCapabilityShapes<Requires>,
) => Store<State> & PipeCapabilityShapes<Adds>;

export type PipeAnyMiddleware<
  Requires extends readonly PipeCapability[] = readonly [],
  Adds extends readonly PipeCapability[] = readonly [],
> = <State>(
  store: Store<State> & PipeCapabilityShapes<Requires>,
) => Store<State> & PipeCapabilityShapes<Adds>;

export type PipeResolvedState<Current, Next> = unknown extends Current ? Next : Current;

export type PipeStateCompatibility<Current, Next> = unknown extends Current
  ? object
  : [Next] extends [Current]
    ? object
    : PipeStateCompatibilityDiagnostic<Current, Next>;

export type PipeInitialStateValidation<NextState> = NextState extends Store<infer State>
  ? {
      readonly __pipeStoreInputError: '__pipeStoreInputError';
      readonly state: State;
    }
  : unknown;

declare const pipeStateDiagnosticBrand: unique symbol;

export type PipeStateCompatibilityDiagnostic<Current, Next> = {
  readonly __pipeStateCompatibilityError: '__pipeStateCompatibilityError';
  readonly current: Current;
  readonly next: Next;
  readonly [pipeStateDiagnosticBrand]?: '__pipeStateCompatibilityError';
};

export type PipeStateAppendValidation<Current, Next> = unknown extends Current
  ? unknown
  : [Current] extends [Next]
    ? unknown
    : {
        readonly __pipeStateCompatibilityError: '__pipeStateCompatibilityError';
        readonly current: Current;
        readonly next: Next;
        readonly [pipeStateDiagnosticBrand]?: '__pipeStateCompatibilityError';
      };

export type PipeBuilder<
  State = unknown,
  Capabilities extends readonly PipeCapability[] = readonly [],
  MetadataChain extends readonly PipeMiddlewareMetadata[] = readonly [],
> = {
  readonly create: <NextState = State>(
    initialState: NextState &
      PipeStateCompatibility<State, NextState> &
      PipeInitialStateValidation<NextState>,
  ) => Store<PipeResolvedState<State, NextState>> & PipeCapabilityShapes<Capabilities>;
  readonly use: {
    <Middleware extends object>(
      middleware: Middleware &
        PipeMiddlewareValidationFor<MetadataChain, Middleware> &
        PipeStateAppendValidationFor<State, Middleware>,
    ): PipeBuilder<
      PipeNextState<State, Middleware>,
      PipeCapabilitiesAfterAppend<Capabilities, PipeRegisteredMetadataFor<Middleware>>,
      [...MetadataChain, PipeRegisteredMetadataFor<Middleware>]
    >;
  };
};

export type Pipe = {
  readonly use: {
    <Middleware extends object>(
      middleware: Middleware & PipeMiddlewareValidationFor<readonly [], Middleware>,
    ): PipeBuilder<
      PipeNextState<unknown, Middleware>,
      PipeMetadataCapabilities<PipeRegisteredMetadataFor<Middleware>, 'adds'>,
      readonly [PipeRegisteredMetadataFor<Middleware>]
    >;
  };
};

export type {
  PipeDuplicateCapabilityDiagnostic,
  PipeDuplicateMiddlewareDiagnostic,
  PipeMetadataChain,
  PipeMiddlewareAppendValidation,
  PipeMiddlewareChainValidation,
  PipeMiddlewareCycleDiagnostic,
  PipeMiddlewareOrderDiagnostic,
  PipeMissingCapabilityDiagnostic,
} from './validation-types';
