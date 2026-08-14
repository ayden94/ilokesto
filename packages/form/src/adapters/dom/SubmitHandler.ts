import type { FieldState, Form } from '../../core/index';
import type { PathKey } from '../../core/types';

export type SubmitEventLike = {
  preventDefault?: () => void;
};

export type SubmitValidHandler<TValues, TResult> = (values: TValues) => TResult | Promise<TResult>;

export type SubmitInvalidHandler = (fields: Readonly<Record<PathKey, FieldState>>) => void;

export type SubmitHandler<TEvent extends SubmitEventLike, TResult> = (event?: TEvent) => Promise<TResult | undefined>;

/** Framework adapter들이 공유하는 submit event wrapper를 만든다. */
export function createSubmitHandler<TValues, TEvent extends SubmitEventLike, TResult>(
  form: Form<TValues>,
  onValid: SubmitValidHandler<TValues, TResult>,
  onInvalid?: SubmitInvalidHandler,
): SubmitHandler<TEvent, TResult> {
  return async event => {
    event?.preventDefault?.();

    return form.submit(onValid, onInvalid);
  };
}
