import { FormPath } from '../path/index.js';
import type { FormStateStore } from '../state/index.js';
import type { ValidationEngine } from '../validation/index.js';
import type { FieldPathInput, FormError, PathKey, SetValueOptions } from '../types.js';

/**
 * 필드 단위 명령을 모아 둔 서비스 클래스다.
 *
 * CreateForm이 public API를 유지하되 너무 많은 책임을 직접 갖지 않도록,
 * 값 변경/blur/error/trigger 흐름을 이 클래스가 담당한다.
 */
export class FormFieldCommands<TValues> {
  /**
   * store는 실제 상태 변경을, validation은 변경 이후 조건부 검증을 담당한다.
   * 두 객체를 함께 받아야 setValue나 blur 같은 복합 명령을 한 곳에서 처리할 수 있다.
   */
  public constructor(
    private readonly store: FormStateStore<TValues>,
    private readonly validation: ValidationEngine<TValues>,
  ) {}

  /**
   * path를 내부 FieldPath로 정규화한 뒤 값을 쓴다.
   *
   * options.validate가 true이거나 validateOn에 change가 있으면 저장 직후 비동기 검증을 시작한다.
   * setValue 자체는 void API이므로 change validation의 Promise는 기다리지 않는다.
   */
  public setValue(path: FieldPathInput, value: unknown, options: SetValueOptions = {}): void {
    const fieldKey = this.store.setValue(FormPath.toFieldPath(path), value, options);

    if (options.validate || this.validation.shouldValidateOn('change')) {
      void this.validation.validateField(fieldKey, 'change');
    }
  }

  /**
   * blur 이벤트를 처리한다.
   *
   * 먼저 touched를 true로 바꾸고, validateOn에 blur가 있을 때만 schema validation을 실행한다.
   * blur validation이 꺼져 있으면 성공으로 간주해 true를 반환한다.
   */
  public async blur(path: FieldPathInput): Promise<boolean> {
    const fieldKey = FormPath.pathInputToKey(path);
    this.store.touchField(fieldKey);

    if (!this.validation.shouldValidateOn('blur')) {
      return true;
    }

    return this.validation.validateField(fieldKey, 'blur');
  }

  /**
   * focus 이벤트 진입점이다.
   *
   * 지금의 FormState에는 focused 필드가 없으므로 상태를 바꾸지 않는다.
   * 다만 framework adapter가 onFocus를 일관된 form 명령으로 합성할 수 있게 메서드는 유지한다.
   */
  public focus(_path: FieldPathInput): void {
    // 현재 최소 상태에는 focused가 없으므로 focus는 framework event 합성을 위한 no-op command로 둔다.
  }

  /** 특정 필드의 errors 배열을 외부에서 전달받은 값으로 교체한다. */
  public setErrors(path: FieldPathInput, errors: readonly FormError[]): void {
    this.store.setErrorsByKey(FormPath.pathInputToKey(path), errors);
  }

  /**
   * errors를 비운다.
   *
   * paths가 비어 있으면 store에 undefined를 넘겨 전체 field errors를 비우고,
   * paths가 있으면 해당 path들만 key로 변환해 부분적으로 비운다.
   */
  public clearErrors(paths: readonly FieldPathInput[]): void {
    this.store.clearErrors(paths.length > 0 ? paths.map(path => FormPath.pathInputToKey(path)) : undefined);
  }

  /**
   * manual validation을 실행한다.
   *
   * paths가 있으면 schema 결과 중 해당 필드 errors만 갱신하고, 없으면 전체 field errors를 갱신한다.
   */
  public trigger(paths: readonly FieldPathInput[]): Promise<boolean> {
    if (paths.length === 0) {
      return this.validation.validateRegisteredFields('manual');
    }

    return this.validation.validateFields(paths.map(path => FormPath.pathInputToKey(path)), 'manual');
  }
}
