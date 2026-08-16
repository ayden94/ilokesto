import type { FieldState } from '../types';

/**
 * FieldState 생성 규칙을 한 곳에 모아 둔다.
 *
 * 초기화, 누락 field 읽기, 새 field 쓰기 모두 같은 기본 shape을 사용해야
 * public API가 항상 동일한 구조를 반환한다.
 */
export class FieldStateFactory {
  /** 모든 field가 공통으로 갖는 기본 메타데이터 값이다. errors는 매번 새 배열로 복사해서 공유 참조를 피한다. */
  private static readonly DEFAULT_FIELD_STATE: FieldState = {
    value: undefined,
    errors: [],
    touched: false,
    dirty: false,
    modified: false,
    isFocused: false,
  };

  /** 특정 value를 가진 새 FieldState를 만든다. 초기 상태이므로 errors/touched/dirty/modified는 모두 비어 있거나 false다. */
  public static create(value: unknown): FieldState {
    return {
      ...this.DEFAULT_FIELD_STATE,
      value,
      errors: [],
    };
  }

  /** value가 아직 없는 field를 읽거나 만들 때 쓰는 기본 FieldState다. */
  public static createDefault(): FieldState {
    return this.create(undefined);
  }
}
