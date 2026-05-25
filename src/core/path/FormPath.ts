import type { FieldPath, FieldPathInput, PathKey } from '../types';

/**
 * public path input과 내부 PathKey 사이의 변환 규칙을 담당한다.
 *
 * @remarks
 * string path는 dot path로 파싱하지 않고 하나의 field 이름으로 취급한다.
 * tuple path만 nested path를 표현한다. 이렇게 해야 실제 key에 `.` 문자가 있어도 충돌하지 않는다.
 */
export class FormPath {
  /**
   * root path를 표현하는 특수 key다.
   *
   * @remarks
   * 일반 path는 JSON.stringify 배열 문자열이므로 `$`와 충돌하지 않는다.
   */
  public static readonly ROOT_PATH_KEY = '$';

  /**
   * tuple path를 편하게 만들기 위한 helper다.
   *
   * @param segments - path segment 목록.
   * @returns FieldPath tuple.
   */
  public static path(...segments: FieldPath): FieldPath {
    return segments;
  }

  /**
   * public API가 받은 path input을 내부 FieldPath로 정규화한다.
   *
   * @param fieldPath - string field 이름 또는 tuple path.
   * @returns 내부에서 사용하는 tuple path.
   */
  public static toFieldPath(fieldPath: FieldPathInput): FieldPath {
    if (typeof fieldPath === 'string') {
      // 문자열은 dot path로 파싱하지 않고 하나의 필드 이름으로 취급해 실제 키의 `.` 문자와 충돌하지 않게 한다.
      return [fieldPath];
    }

    return fieldPath;
  }

  /**
   * public path input을 바로 store key로 변환한다.
   *
   * @param fieldPath - public API path input.
   * @returns FormState.fields에서 사용할 PathKey.
   */
  public static pathInputToKey(fieldPath: FieldPathInput): PathKey {
    return this.pathToKey(this.toFieldPath(fieldPath));
  }

  /**
   * tuple path를 object key로 안전하게 사용할 문자열로 변환한다.
   *
   * @param fieldPath - 내부 tuple path.
   * @returns root이면 `$`, 아니면 JSON 문자열 PathKey.
   */
  public static pathToKey(fieldPath: FieldPath): PathKey {
    if (fieldPath.length === 0) {
      return this.ROOT_PATH_KEY;
    }

    // 구분자 기반 문자열 대신 JSON을 쓰면 `user.name` 같은 실제 키와 경로 표기가 충돌하지 않는다.
    return JSON.stringify(fieldPath);
  }

  /**
   * pathToKey가 만든 key를 다시 FieldPath로 복원한다.
   *
   * @param key - FormState.fields 또는 arrayKeys의 key.
   * @returns 복원된 tuple path.
   * @throws key가 유효한 path key가 아니면 Error를 던진다.
   */
  public static keyToPath(key: PathKey): FieldPath {
    if (key === this.ROOT_PATH_KEY) {
      return [];
    }

    // 외부 입력이 들어올 수 있으므로 파싱 결과를 바로 믿지 않고 아래에서 segment 타입을 검증한다.
    const parsed: unknown = JSON.parse(key);

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid form path key: ${key}`);
    }

    return parsed.map(segment => {
      if (typeof segment === 'string' || typeof segment === 'number') {
        return segment;
      }

      throw new Error(`Invalid form path segment in key: ${key}`);
    });
  }
}
