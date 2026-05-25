import { FormPath } from '../path/index.js';
import type { FieldPath, FormState, PathKey } from '../types.js';

/**
 * nested values를 읽고 쓰고 복원하는 helper다.
 *
 * @remarks
 * FormState는 leaf field 중심으로 저장되므로, 사용자에게 돌려줄 때는 다시 nested object/array로 조립해야 한다.
 * 이 클래스는 그 조립 과정에서 필요한 immutable set/get 로직을 제공한다.
 */
export class ValueHelper {
  /**
   * values 복원을 시작할 root container를 만든다.
   *
   * @param source - initialValues의 root 값.
   * @returns source가 배열이면 빈 배열, 객체면 빈 객체, primitive면 source 자체.
   */
  private static createEmptyRoot(source: unknown): unknown {
    if (Array.isArray(source)) {
      return [];
    }

    if (typeof source === 'object' && source !== null) {
      return {};
    }

    return source;
  }

  /**
   * tuple path를 사용해 nested 값을 읽는다.
   *
   * @param source - 값을 읽을 root object/array.
   * @param path - 읽을 위치를 나타내는 tuple path.
   * @returns path가 존재하면 해당 값, 중간 값이 nullish 또는 primitive이면 undefined.
   */
  public static getValueAtPath(source: unknown, path: FieldPath): unknown {
    let current = source;

    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object' && typeof current !== 'function') {
        return undefined;
      }

      current = (current as Record<string | number, unknown>)[segment];
    }

    return current;
  }

  /**
   * tuple path 위치에 값을 쓴 새 object/array 구조를 반환한다.
   *
   * @remarks
   * 원본 객체를 직접 변경하지 않고, path를 따라 필요한 container만 얕게 복사한다.
   * 다음 segment가 number이면 누락 container를 배열로 만들고, string이면 객체로 만든다.
   *
   * @param source - 원본 values.
   * @param path - 값을 쓸 위치.
   * @param value - 새로 쓸 값.
   * @returns value가 반영된 새 values.
   */
  public static setValueAtPath<TValues>(source: TValues, path: FieldPath, value: unknown): TValues {
    if (path.length === 0) {
      return value as TValues;
    }

    const cloneRoot = Array.isArray(source)
      ? [...source]
      : typeof source === 'object' && source !== null
        ? { ...source }
        : {};
    let current: Record<string | number, unknown> = cloneRoot as Record<string | number, unknown>;

    path.forEach((segment, index) => {
      if (index === path.length - 1) {
        current[segment] = value;
        return;
      }

      const nextSegment = path[index + 1];
      const previous = current[segment];
      const next = Array.isArray(previous)
        ? [...previous]
        : typeof previous === 'object' && previous !== null
          ? { ...previous }
          : typeof nextSegment === 'number'
            ? []
            : {};

      current[segment] = next;
      current = next as Record<string | number, unknown>;
    });

    return cloneRoot as TValues;
  }

  /**
   * FormState의 fields와 arrayKeys를 사용해 전체 values 객체를 복원한다.
   *
   * @remarks
   * 먼저 arrayKeys를 기준으로 빈 배열 container를 만들고,
   * 그 다음 fields의 leaf value를 각 path 위치에 쓴다.
   *
   * @param state - 현재 FormState.
   * @param fieldPaths - PathKey를 FieldPath로 복원한 lookup map.
   * @returns 사용자에게 반환할 TValues 형태의 values.
   */
  public static getValuesFromFields<TValues>(
    state: FormState<TValues>,
    fieldPaths: Readonly<Record<PathKey, FieldPath>>,
  ): TValues {
    const valueWithArrays = Object.entries(state.arrayKeys).reduce<unknown>((values, [key, keys]) => {
      return this.setValueAtPath(values, FormPath.keyToPath(key), new Array(keys.length));
    }, this.createEmptyRoot(state.initialValues));

    return Object.entries(state.fields).reduce<TValues>((values, [key, field]) => {
      const fieldPath = fieldPaths[key];

      if (!fieldPath) {
        return values;
      }

      return this.setValueAtPath(values, fieldPath, field.value);
    }, valueWithArrays as TValues);
  }
}
