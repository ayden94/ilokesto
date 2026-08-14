import type { FieldPath } from '../types';

/**
 * 배열 field path 판별과 변환을 담당하는 helper다.
 *
 * @remarks
 * FormArrayRebaser가 field path를 다룰 때 필요한 경로 계산만 분리했다.
 * 이 클래스는 상태를 전혀 다루지 않고 FieldPath 배열만 처리한다.
 */
export class FormArrayPath {
  /**
   * fieldPath가 prefix로 시작하는지 확인한다.
   *
   * @param fieldPath - 검사할 path.
   * @param prefix - 앞부분에 있어야 하는 path.
   * @returns prefix가 모두 일치하면 true.
   */
  public static hasPathPrefix(fieldPath: FieldPath, prefix: FieldPath): boolean {
    return prefix.every((segment, index) => Object.is(fieldPath[index], segment));
  }

  /**
   * fieldPath가 arrayPath 아래의 item field인지 확인한다.
   *
   * @param fieldPath - 검사할 field path.
   * @param arrayPath - 배열 field path.
   * @returns arrayPath 뒤 segment가 number이면 배열 item child로 본다.
   */
  public static isArrayChildPath(fieldPath: FieldPath, arrayPath: FieldPath): boolean {
    return fieldPath.length > arrayPath.length && this.hasPathPrefix(fieldPath, arrayPath) && typeof fieldPath[arrayPath.length] === 'number';
  }

  /**
   * 배열 child field path에서 item index segment만 교체한다.
   *
   * @param fieldPath - 기존 field path.
   * @param arrayPath - 배열 field path.
   * @param nextIndex - 교체할 새 index.
   * @returns 새 index를 가진 field path.
   */
  public static replaceArrayIndex(fieldPath: FieldPath, arrayPath: FieldPath, nextIndex: number): FieldPath {
    return [...arrayPath, nextIndex, ...fieldPath.slice(arrayPath.length + 1)];
  }
}
