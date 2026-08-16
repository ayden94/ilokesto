import type { Store } from '@ilokesto/store';
import { produce } from 'immer';

import { FieldStateFactory } from './FieldStateFactory';
import { FormStateInitializer } from './FormStateInitializer';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

type WritableFormStore<TValues> = Pick<Store<FormState<TValues>>, 'getState' | 'setState'>;

/**
 * FormState의 모든 쓰기 작업을 담당한다.
 *
 * 상태 변경은 immer produce 안에서만 수행하고, 외부에는 항상 새 FormState snapshot이 전달된다.
 * FormStateStore는 이 writer에 위임해 읽기/쓰기 책임을 분리한다.
 */
export class FormStateWriter<TValues> {
  /** getState와 setState만 있으면 충분하므로 Store 전체 API에 의존하지 않는다. */
  public constructor(private readonly store: WritableFormStore<TValues>) {}

  /**
   * 한 field value를 갱신한다.
   *
   * dirty는 defaultValues의 같은 path 값과 Object.is로 비교해 계산한다.
   * modified는 사용자가 만든 변경(source: 'user')일 때만 true로 바꾼다.
   * 반환한 PathKey는 이후 validation 실행에 재사용된다.
   */
  public setValue(fieldPath: FieldPath, value: unknown, options: SetValueOptions = {}): PathKey {
    const fieldKey = FormPath.pathToKey(fieldPath);
    const defaultValue = ValueHelper.getValueAtPath(this.store.getState().defaultValues, fieldPath);

    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          value,
          dirty: !FormStateWriter.isSameValue(value, defaultValue),
          modified: options.source === 'user' ? true : previousField.modified,
        };
      }),
    );

    return fieldKey;
  }

  /** blur된 field의 touched flag를 true로 바꾼다. 기존 field가 없으면 default state에서 시작한다. */
  public touchField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          touched: true,
        };
      }),
    );
  }

  /**
   * field의 isFocused를 true로 바꾼다. focus 이벤트에서 호출된다.
   *
   * fieldKey에 해당하는 field가 없으면 default state를 생성해 기록한다. 이는 touchField와 동일한 패턴이지만,
   * 존재하지 않는 path에 대해 의도치 않게 field가 생성되는 부수 효과에 유의해야 한다.
   */
  public focusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: true,
        };
      }),
    );
  }

  /**
   * field의 isFocused를 false로 바꾼다. blur 이벤트에서 호출된다.
   *
   * fieldKey에 해당하는 field가 없으면 default state를 생성해 기록한다. focusField와 동일한 fallback 패턴이며,
   * 존재하지 않는 path에 대해 의도치 않게 field가 생성되는 부수 효과에 유의해야 한다.
   */
  public unfocusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: false,
        };
      }),
    );
  }

  /** validation 또는 외부 명령 결과로 field의 errors를 통째로 교체한다. */
  public setErrorsByKey(fieldKey: PathKey, errors: readonly FormError[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          errors: [...errors],
        };
      }),
    );
  }

  /**
   * errors를 비운다.
   *
   * fieldKeys가 있으면 해당 key들만 대상으로 하고, 없으면 현재 존재하는 모든 fields를 대상으로 한다.
   * 존재하지 않는 key가 들어와도 default field를 만든 뒤 errors: [] 상태로 저장한다.
   */
  public clearErrors(fieldKeys?: readonly PathKey[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const keys = fieldKeys && fieldKeys.length > 0 ? fieldKeys : Object.keys(draft.fields);

        keys.forEach(fieldKey => {
          const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

          draft.fields[fieldKey] = {
            ...previousField,
            errors: [],
          };
        });
      }),
    );
  }

  /** 새 values가 있으면 그것을 새 defaultValues로 삼고, 없으면 기존 defaultValues로 FormState를 재생성한다. */
  public reset(values?: TValues, options: ResetOptions = {}): void {
    const previousState = this.store.getState();
    const nextDefaultValues = values ?? previousState.defaultValues;
    const initializedState = FormStateInitializer.initialize(nextDefaultValues);

    this.store.setState(
      produce(initializedState, draft => {
        Object.entries(draft.fields).forEach(([fieldKey, nextField]) => {
          const previousField = previousState.fields[fieldKey];

          if (!previousField) {
            return;
          }

          if (options.keepDirtyValues && previousField.dirty) {
            const fieldPath = FormPath.keyToPath(fieldKey);
            const defaultValue = ValueHelper.getValueAtPath(nextDefaultValues, fieldPath);

            nextField.value = previousField.value;
            nextField.dirty = !FormStateWriter.isSameValue(previousField.value, defaultValue);
            nextField.modified = previousField.modified;
          }

          if (options.keepErrors) {
            nextField.errors = [...previousField.errors];
          }

          if (options.keepTouched) {
            nextField.touched = previousField.touched;
          }
        });

        if (options.keepSubmitState) {
          draft.submitCount = previousState.submitCount;
          draft.isSubmitting = previousState.isSubmitting;
          draft.isSubmitted = previousState.isSubmitted;
          draft.isSubmitSuccessful = previousState.isSubmitSuccessful;
        }
      }),
    );
  }

  /** submit 시도 횟수를 증가시키고 진행 중 상태를 기록한다. */
  public beginSubmit(): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.submitCount += 1;
        draft.isSubmitting = true;
        draft.isSubmitSuccessful = false;
      }),
    );
  }

  /** submit validation/callback 완료 후 성공 여부를 기록한다. */
  public completeSubmit(successful: boolean): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.isSubmitting = false;
        draft.isSubmitted = true;
        draft.isSubmitSuccessful = successful;
      }),
    );
  }

  /** 이미 완성된 FormState updater를 store에 전달한다. 배열 리베이스처럼 여러 조각을 한 번에 바꿀 때 사용한다. */
  public replaceState(updater: (previousState: FormState<TValues>) => FormState<TValues>): void {
    this.store.setState(updater);
  }

  /** dirty 계산에 쓰는 값 비교 규칙이다. NaN 같은 JS 특수값을 위해 Object.is를 사용한다. */
  private static isSameValue(left: unknown, right: unknown): boolean {
    return Object.is(left, right);
  }
}
