import { ArrayKeyGenerator } from './ArrayKeyGenerator';
import { FormArrayMutationPlanner, type FormArrayMutation } from './FormArrayMutationPlanner';
import { FormPath } from '../path/index';
import { FormStateStore } from '../state/index';
import { FormArrayRebaser, type IndexMapper } from './FormArrayRebaser';
import type { FieldPath, FormArray } from '../types';

/**
 * 한 배열 field에 대한 public 명령 객체다.
 *
 * @remarks
 * 이 클래스는 배열 조작 요청을 받고 현재 배열 값/키를 읽은 뒤,
 * 실제 다음 배열 계산은 {@link FormArrayMutationPlanner}에 맡긴다.
 * 계산된 결과는 {@link FormArrayRebaser}를 통해 fields, values, arrayKeys가 함께 맞춰진다.
 */
export class FormArrayController<TValues> implements FormArray {
  /** 배열 값과 arrayKeys를 읽고, 최종 FormState를 교체할 store다. */
  private readonly store: FormStateStore<TValues>;
  /** 새 배열 item에 부여할 안정적인 render key를 만든다. */
  private readonly keyGenerator: ArrayKeyGenerator;
  /** 이 controller가 담당하는 배열 field의 내부 tuple path다. */
  private readonly fieldPath: FieldPath;
  /** insert/remove/move/swap/replace의 다음 배열 상태를 계산하는 planner다. */
  private readonly mutations: FormArrayMutationPlanner;

  /**
   * 배열 controller를 만든다.
   *
   * @param store - form state store.
   * @param keys - item key 생성기. factory가 같은 생성기를 공유해 key 충돌을 줄인다.
   * @param fieldPath - 제어할 배열 field path.
   */
  public constructor(store: FormStateStore<TValues>, keys: ArrayKeyGenerator, fieldPath: FieldPath) {
    this.store = store;
    this.keyGenerator = keys;
    this.fieldPath = fieldPath;
    this.mutations = new FormArrayMutationPlanner();
  }

  /**
   * 현재 배열 item들의 안정적인 render key를 반환한다.
   *
   * @returns UI list key 등으로 사용할 수 있는 문자열 배열.
   */
  public keys(): readonly string[] {
    return this.getKeys();
  }

  /**
   * 배열 중간에 item을 삽입한다.
   *
   * @param index - 삽입할 위치. 범위를 벗어나면 0과 length 사이로 보정된다.
   * @param value - 삽입할 item value.
   */
  public insert(index: number, value: unknown): void {
    this.applyMutation(this.mutations.insert(this.getArray(), this.getKeys(), index, value, this.keyGenerator.create()));
  }

  /**
   * 배열 끝에 item을 추가한다.
   *
   * @param value - 추가할 item value.
   */
  public push(value: unknown): void {
    this.applyMutation(this.mutations.push(this.getArray(), this.getKeys(), value, this.keyGenerator.create()));
  }

  /**
   * 지정 index의 item을 제거한다.
   *
   * @param index - 제거할 item index. 유효하지 않으면 아무 일도 하지 않는다.
   */
  public remove(index: number): void {
    this.applyMutation(this.mutations.remove(this.getArray(), this.getKeys(), index));
  }

  /**
   * item을 한 위치에서 다른 위치로 이동한다.
   *
   * @param fromIndex - 이동할 기존 index.
   * @param toIndex - 이동 후 index.
   */
  public move(fromIndex: number, toIndex: number): void {
    this.applyMutation(this.mutations.move(this.getArray(), this.getKeys(), fromIndex, toIndex));
  }

  /**
   * 두 item의 위치를 맞바꾼다.
   *
   * @param leftIndex - 첫 번째 item index.
   * @param rightIndex - 두 번째 item index.
   */
  public swap(leftIndex: number, rightIndex: number): void {
    this.applyMutation(this.mutations.swap(this.getArray(), this.getKeys(), leftIndex, rightIndex));
  }

  /**
   * 배열 전체를 새 values로 교체한다.
   *
   * @remarks
   * 기존 child field 상태는 재사용하지 않는다. 모든 item key도 새로 만든다.
   *
   * @param values - 새 배열 값.
   */
  public replace(values: readonly unknown[]): void {
    this.applyMutation(this.mutations.replace(values, values.map(() => this.keyGenerator.create())));
  }

  /**
   * store에서 현재 배열 값을 읽는다.
   *
   * @returns path의 값이 배열이면 그 배열, 아니면 빈 배열.
   */
  private getArray(): unknown[] {
    const value = this.store.getValueAtPath(this.fieldPath);
    return Array.isArray(value) ? value : [];
  }

  /**
   * 현재 배열에 대응하는 render key 목록을 읽는다.
   *
   * @returns store에 저장된 arrayKeys가 있으면 그것을 사용하고, 없으면 현재 배열 길이만큼 새 key를 만든다.
   */
  private getKeys(): string[] {
    const arrayKey = FormPath.pathToKey(this.fieldPath);
    const currentArray = this.getArray();
    return this.store.getState().arrayKeys[arrayKey] ?? currentArray.map(() => this.keyGenerator.create());
  }

  /**
   * planner가 만든 mutation이 있으면 rebase를 실행한다.
   *
   * @param mutation - 유효하지 않은 조작이면 undefined일 수 있다.
   */
  private applyMutation(mutation: FormArrayMutation | undefined): void {
    if (!mutation) {
      return;
    }

    this.rebase(mutation.values, mutation.keys, mutation.mapPreviousIndex);
  }

  /**
   * 다음 배열 값과 key 목록을 FormState 전체에 반영한다.
   *
   * @param nextArray - 변경 후 배열 값.
   * @param nextKeys - 변경 후 item key 목록.
   * @param mapPreviousIndex - 기존 child field index를 새 index로 매핑하는 함수.
   */
  private rebase(nextArray: readonly unknown[], nextKeys: readonly string[], mapPreviousIndex: IndexMapper): void {
    this.store.replaceState(() =>
      FormArrayRebaser.rebase(this.store, this.fieldPath, nextArray, nextKeys, mapPreviousIndex),
    );
  }
}
