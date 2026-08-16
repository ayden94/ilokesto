import { FormArrayFactory } from '../array/index';
import { FormFieldCommands } from './FormFieldCommands';
import { FormSubmitter } from './FormSubmitter';
import { FormStateStore } from '../state/index';
import { FormPath } from '../path/index';
import { ValidationEngine } from '../validation/index';
import type { CreateFormOptions, FieldPathInput, FieldSchemaOptions, FieldState, Form, FormArray, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

/**
 * 프레임워크와 무관한 form의 최상위 진입점이다.
 *
 * framework adapter는 이 클래스를 직접 소유하거나 감싸서 사용한다.
 * 이 클래스는 실제 비즈니스 로직을 직접 많이 들고 있지 않고,
 * 상태 읽기/쓰기, 필드 명령, 배열 명령, submit 흐름을 각 전담 클래스로 위임한다.
 */
export class CreateForm<TValues> implements Form<TValues> {
  /** form의 단일 상태 저장소. 모든 값/필드 메타데이터/배열 키는 이 store를 통해 읽고 쓴다. */
  private readonly store: FormStateStore<TValues>;
  /** setValue, blur, setErrors, trigger처럼 필드 단위로 실행되는 명령 묶음. */
  private readonly fields: FormFieldCommands<TValues>;
  /** array(path) 호출 시 배열 전용 컨트롤러를 만들어 주는 factory. */
  private readonly arrays: FormArrayFactory<TValues>;
  /** submitCount 증가, submit validation, onValid/onInvalid 호출을 담당한다. */
  private readonly submitter: FormSubmitter<TValues>;

  /**
   * defaultValues로 form 상태를 초기화하고, 같은 store를 공유하는 협력 객체들을 연결한다.
   *
   * ValidationEngine도 같은 store를 바라보기 때문에 schema validation은 항상 최신 값을 기준으로 실행된다.
   */
  public constructor(options: CreateFormOptions<TValues>) {
    this.store = new FormStateStore(options.defaultValues);

    const validation = new ValidationEngine(this.store, options);

    this.fields = new FormFieldCommands(this.store, validation);
    this.arrays = new FormArrayFactory(this.store);
    this.submitter = new FormSubmitter(this.store, validation);
  }

  /** 현재 form snapshot을 그대로 반환한다. 값, 필드 메타, submitCount, arrayKeys를 모두 포함한다. */
  public getState(): Readonly<FormState<TValues>> {
    return this.store.getState();
  }

  /** store 변경을 구독한다. framework adapter가 외부 store 구독을 연결할 때 사용된다. */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /** field-local schema를 validation engine에 등록하고 cleanup 함수를 반환한다. */
  public registerFieldSchema(path: FieldPathInput, options: FieldSchemaOptions): () => void {
    return this.fields.registerFieldSchema(path, options);
  }

  /** path에 해당하는 FieldState를 반환한다. 없는 필드는 읽기용 기본 상태를 만들어 반환한다. */
  public getFieldState(path: FieldPathInput): Readonly<FieldState> {
    return this.store.getFieldState(path);
  }

  /** path에 해당하는 현재 field value만 반환한다. */
  public getValue(path: FieldPathInput): unknown {
    return this.store.getValue(path);
  }

  /** fields와 arrayKeys를 조합해 사용자가 기대하는 TValues 형태의 객체를 복원한다. */
  public getValues(): TValues {
    return this.store.getValues();
  }

  /** 한 필드의 값을 변경하고, 옵션 또는 validateOn 설정에 따라 change validation을 실행한다. */
  public setValue(path: FieldPathInput, value: unknown, options: SetValueOptions = {}): void {
    this.fields.setValue(path, value, options);
  }

  /** 한 필드를 touched 처리하고, validateOn에 blur가 포함되어 있으면 schema validation을 실행한다. */
  public blur(path: FieldPathInput): Promise<boolean> {
    return this.fields.blur(path);
  }

  /** field의 isFocused를 true로 바꾼다. focus 이벤트에서 호출된다. */
  public focus(path: FieldPathInput): void {
    this.fields.focus(path);
  }

  /** 외부에서 직접 특정 필드의 error 목록을 교체할 때 사용한다. */
  public setErrors(path: FieldPathInput, errors: readonly FormError[]): void {
    this.fields.setErrors(path, errors);
  }

  /** 지정한 필드들의 errors를 비우거나, path가 없으면 모든 필드 errors를 비운다. */
  public clearErrors(...paths: FieldPathInput[]): void {
    this.fields.clearErrors(paths);
  }

  /** schema validation을 수동 실행한다. path가 있으면 해당 필드 errors만 갱신한다. */
  public trigger(...paths: FieldPathInput[]): Promise<boolean> {
    return this.fields.trigger(paths);
  }

  /** 배열 필드를 push/remove/move/swap/replace할 수 있는 전용 명령 객체를 반환한다. */
  public array(path: FieldPathInput): FormArray {
    return this.arrays.create(FormPath.toFieldPath(path));
  }

  /** form을 defaultValues 또는 새 values 기준으로 초기 상태로 되돌린다. */
  public reset(values?: TValues, options?: ResetOptions): void {
    this.store.reset(values, options);
  }

  /** submit 횟수를 증가시키고 submit validation을 통과하면 onValid를 실행한다. */
  public submit<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined> {
    return this.submitter.submit(onValid, onInvalid);
  }
}
