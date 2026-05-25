import type { FormStateStore } from '../state/index.js';
import type { ValidationEngine } from '../validation/index.js';
import type { FieldState, PathKey } from '../types.js';

/**
 * submit 전용 흐름을 담당한다.
 *
 * submit은 단순 field write보다 단계가 많다:
 * submitCount 증가 -> schema validation 실행 -> 성공/실패 callback 분기.
 * 이 흐름을 CreateForm에서 분리해 최상위 controller를 얇게 유지한다.
 */
export class FormSubmitter<TValues> {
  /** 같은 store와 validation engine을 공유해야 submitCount와 schema 결과가 같은 snapshot 위에서 동작한다. */
  public constructor(
    private readonly store: FormStateStore<TValues>,
    private readonly validation: ValidationEngine<TValues>,
  ) {}

  /**
   * submit 이벤트의 핵심 처리 순서다.
   *
   * 1. submitCount를 먼저 증가시켜 시도 횟수를 남긴다.
   * 2. schema validation을 submit trigger로 실행한다.
   * 3. 실패하면 onInvalid에 현재 fields를 넘기고 undefined를 반환한다.
   * 4. 성공하면 최신 values를 복원해 onValid에 전달한다.
   */
  public async submit<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined> {
    this.store.incrementSubmitCount();

    const isValid = await this.validation.validateRegisteredFields('submit');

    if (!isValid) {
      onInvalid?.(this.store.getState().fields);
      return undefined;
    }

    return onValid(this.store.getValues());
  }
}
