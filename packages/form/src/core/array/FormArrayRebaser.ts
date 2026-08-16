import type { IndexMapper } from './ArrayItemReorder';
import { FormArrayPath } from './FormArrayPath';
import { FormStateInitializer } from '../state/FormStateInitializer';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import { FormStateStore } from '../state/index';
import type { FieldPath, FormState } from '../types';

export type { IndexMapper } from './ArrayItemReorder';

/**
 * 배열 변경 이후 FormState 전체를 다시 맞추는 rebase 담당 클래스다.
 *
 * @remarks
 * 배열 item의 index가 바뀌면 `items[0].name` 같은 child field key도 함께 바뀌어야 한다.
 * 이 클래스는 새 values를 초기화한 뒤, 기존 child field의 errors/touched/dirty/modified 메타데이터를
 * 새 index 위치로 옮긴다.
 */
export class FormArrayRebaser {
  /**
   * 배열 변경 결과를 FormState 전체에 반영한다.
   *
   * @remarks
   * 처리 순서는 다음과 같다.
   *
   * 1. 현재 values에 nextArray를 써서 nextValues를 만든다.
   * 2. nextValues를 기준으로 FormState를 새로 초기화한다.
   * 3. 기존 fields를 순회하며 배열 밖 field는 그대로 보존한다.
   * 4. 배열 child field는 mapPreviousIndex로 새 index를 찾아 메타데이터를 옮긴다.
   * 5. arrayKeys와 submitCount를 새 state에 다시 반영한다.
   *
   * @param store - 현재 FormState를 읽을 store.
   * @param fieldPath - 변경된 배열 field path.
   * @param nextArray - 변경 후 배열 값.
   * @param nextKeys - 변경 후 배열 item key 목록.
   * @param mapPreviousIndex - 이전 item index를 새 index로 바꾸는 mapper.
   * @returns store에 넣을 새 FormState.
   */
  public static rebase<TValues>(
    store: FormStateStore<TValues>,
    fieldPath: FieldPath,
    nextArray: readonly unknown[],
    nextKeys: readonly string[],
    mapPreviousIndex: IndexMapper,
  ): FormState<TValues> {
    const fieldPaths = store.getKnownFieldPaths();
    const nextValues = ValueHelper.setValueAtPath(store.getValues(), fieldPath, [...nextArray]);
    const initializedState = FormStateInitializer.initialize(nextValues);
    const arrayKey = FormPath.pathToKey(fieldPath);
    const rebasedFields = { ...initializedState.fields };

    Object.entries(store.getState().fields).forEach(([fieldKey, previousField]) => {
      const currentFieldPath = fieldPaths[fieldKey];

      if (!currentFieldPath) {
        return;
      }

      if (!FormArrayPath.isArrayChildPath(currentFieldPath, fieldPath)) {
        rebasedFields[fieldKey] = previousField;
        return;
      }

      const previousIndex = currentFieldPath[fieldPath.length];

      if (typeof previousIndex !== 'number') {
        return;
      }

      const nextIndex = mapPreviousIndex(previousIndex);

      if (nextIndex === undefined) {
        return;
      }

      const nextFieldPath = FormArrayPath.replaceArrayIndex(currentFieldPath, fieldPath, nextIndex);
      const nextFieldKey = FormPath.pathToKey(nextFieldPath);
      const nextField = initializedState.fields[nextFieldKey] ?? FormStateStore.getDefaultFieldState();

      rebasedFields[nextFieldKey] = {
        ...nextField,
        errors: previousField.errors,
        touched: previousField.touched,
        dirty: previousField.dirty,
        modified: previousField.modified,
        isFocused: previousField.isFocused,
      };
    });

    return {
      ...initializedState,
      fields: rebasedFields,
      arrayKeys: {
        ...initializedState.arrayKeys,
        [arrayKey]: [...nextKeys],
      },
      submitCount: store.getState().submitCount,
      isSubmitting: store.getState().isSubmitting,
      isSubmitted: store.getState().isSubmitted,
      isSubmitSuccessful: store.getState().isSubmitSuccessful,
    };
  }
}
