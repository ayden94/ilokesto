import { Store } from '@ilokesto/store';

import { FieldStateFactory } from './FieldStateFactory';
import { FormStateReader } from './FormStateReader';
import { FormStateWriter } from './FormStateWriter';
import { FormStateInitializer } from './FormStateInitializer';
import type { FieldPath, FieldPathInput, FieldState, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

/**
 * core 상태 저장소의 facade다.
 *
 * 실제 상태 보관은 @ilokesto/store가 맡고, 읽기 로직은 FormStateReader,
 * 쓰기 로직은 FormStateWriter에 위임한다. 외부 협력 클래스들은 이 facade만 알면 된다.
 */
export class FormStateStore<TValues> {
  /** subscribe/getState/setState를 제공하는 외부 store 구현체. */
  private readonly store: Store<FormState<TValues>>;
  /** field state와 values를 읽고 복원하는 전담 객체. */
  private readonly reader: FormStateReader<TValues>;
  /** immer 기반으로 FormState를 갱신하는 전담 객체. */
  private readonly writer: FormStateWriter<TValues>;

  /** 존재하지 않는 필드를 읽을 때도 public API가 안정적인 FieldState shape을 반환하도록 만든다. */
  public static getDefaultFieldState(): FieldState {
    return FieldStateFactory.createDefault();
  }

  /**
   * defaultValues를 FormState로 변환해 store를 만든다.
   *
   * FormStateInitializer는 nested object/array를 순회해 leaf field와 array key 정보를 만든다.
   */
  public constructor(defaultValues: TValues) {
    this.store = new Store<FormState<TValues>>(FormStateInitializer.initialize(defaultValues));
    this.reader = new FormStateReader(() => this.store.getState());
    this.writer = new FormStateWriter(this.store);
  }

  /** 현재 FormState snapshot을 반환한다. 반환값은 읽기 전용으로 취급한다. */
  public getState(): Readonly<FormState<TValues>> {
    return this.store.getState();
  }

  /** 상태 변경 시 호출될 listener를 등록하고 unsubscribe 함수를 반환한다. */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /** 현재 fields에 존재하는 모든 PathKey를 FieldPath로 되돌린 map을 만든다. */
  public getKnownFieldPaths(): Record<PathKey, FieldPath> {
    return this.reader.getKnownFieldPaths();
  }

  /** 이미 정규화된 key로 FieldState를 읽는다. validation처럼 key 기반으로 동작하는 곳에서 사용한다. */
  public getFieldStateByKey(fieldKey: PathKey): Readonly<FieldState> {
    return this.reader.getFieldStateByKey(fieldKey);
  }

  /** public path input을 받아 해당 FieldState를 읽는다. */
  public getFieldState(fieldPath: FieldPathInput): Readonly<FieldState> {
    return this.reader.getFieldState(fieldPath);
  }

  /** public path input을 받아 해당 value만 읽는다. */
  public getValue(fieldPath: FieldPathInput): unknown {
    return this.reader.getValue(fieldPath);
  }

  /** fields와 arrayKeys로부터 전체 values 객체를 복원한다. */
  public getValues(): TValues {
    return this.reader.getValues();
  }

  /** 내부 FieldPath를 기준으로 최신 values에서 nested value를 읽는다. 배열 controller가 현재 배열 값을 얻을 때 사용한다. */
  public getValueAtPath(fieldPath: FieldPath): unknown {
    return this.reader.getValueAtPath(fieldPath);
  }

  /** 한 field value를 쓰고, dirty/modified 같은 메타데이터를 함께 갱신한다. */
  public setValue(fieldPath: FieldPath, value: unknown, options: SetValueOptions = {}): PathKey {
    return this.writer.setValue(fieldPath, value, options);
  }

  /** field를 touched 상태로 바꾼다. 보통 blur 이벤트에서 호출된다. */
  public touchField(fieldKey: PathKey): void {
    this.writer.touchField(fieldKey);
  }

  /** field의 isFocused를 true로 바꾼다. focus 이벤트에서 호출된다. */
  public focusField(fieldKey: PathKey): void {
    this.writer.focusField(fieldKey);
  }

  /** field의 isFocused를 false로 바꾼다. blur 이벤트에서 호출된다. */
  public unfocusField(fieldKey: PathKey): void {
    this.writer.unfocusField(fieldKey);
  }

  /** field의 errors를 새 배열로 교체한다. validation 결과와 외부 setErrors가 공통으로 사용한다. */
  public setErrorsByKey(fieldKey: PathKey, errors: readonly FormError[]): void {
    this.writer.setErrorsByKey(fieldKey, errors);
  }

  /** 특정 fields 또는 전체 fields의 errors를 비운다. */
  public clearErrors(fieldKeys?: readonly PathKey[]): void {
    this.writer.clearErrors(fieldKeys);
  }

  /** form을 defaultValues 또는 새 values 기준으로 다시 초기화한다. */
  public reset(values?: TValues, options?: ResetOptions): void {
    this.writer.reset(values, options);
  }

  /** submit 시도 시작 상태를 기록한다. */
  public beginSubmit(): void {
    this.writer.beginSubmit();
  }

  /** submit 시도 완료 상태를 기록한다. */
  public completeSubmit(successful: boolean): void {
    this.writer.completeSubmit(successful);
  }

  /** 배열 rebasing처럼 전체 FormState를 계산해 교체해야 하는 작업에 쓰는 escape hatch다. */
  public replaceState(updater: (previousState: FormState<TValues>) => FormState<TValues>): void {
    this.writer.replaceState(updater);
  }
}
