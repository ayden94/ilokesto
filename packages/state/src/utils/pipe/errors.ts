export type PipeConfigurationErrorCode =
  | 'DUPLICATE_CAPABILITY'
  | 'DUPLICATE_MIDDLEWARE'
  | 'INVALID_METADATA'
  | 'INVALID_MIDDLEWARE_RESULT'
  | 'INVALID_STORE_INPUT'
  | 'MISSING_CAPABILITY'
  | 'MIDDLEWARE_CONFLICT'
  | 'MIDDLEWARE_CYCLE'
  | 'MIDDLEWARE_ORDER';

type PipeConfigurationErrorContext = {
  readonly id: string;
  readonly ids: readonly string[];
};

export class PipeConfigurationError extends TypeError {
  readonly code: PipeConfigurationErrorCode;
  readonly id: string;
  readonly ids: readonly string[];
  readonly name = 'PipeConfigurationError';

  constructor(
    code: PipeConfigurationErrorCode,
    message: string,
    context: PipeConfigurationErrorContext,
  ) {
    super(message);
    this.code = code;
    this.id = context.id;
    this.ids = Object.freeze([...context.ids]);
  }
}
