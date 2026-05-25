import { ArrayKeyGenerator } from './ArrayKeyGenerator.js';
import { FormArrayController } from './FormArrayController.js';
import { FormStateStore } from '../state/index.js';
import type { FieldPath, FormArray } from '../types.js';

/**
 * 배열 field controller를 생성하는 factory다.
 *
 * @remarks
 * 하나의 form 인스턴스 안에서는 같은 ArrayKeyGenerator를 공유한다.
 * 그래야 여러 array controller를 만들어도 새 item key가 단조롭게 증가한다.
 */
export class FormArrayFactory<TValues> {
  /** 생성된 array controller들이 공유할 form state store다. */
  private readonly store: FormStateStore<TValues>;
  /** 새 array item key를 만드는 공유 generator다. */
  private readonly keys: ArrayKeyGenerator;

  /**
   * factory를 만든다.
   *
   * @param store - array controller가 읽고 쓸 form state store.
   */
  public constructor(store: FormStateStore<TValues>) {
    this.store = store;
    this.keys = new ArrayKeyGenerator();
  }

  /**
   * 특정 배열 field를 제어할 FormArray 구현체를 만든다.
   *
   * @param fieldPath - 배열 field의 내부 tuple path.
   * @returns push/remove/move/swap/replace 명령을 가진 controller.
   */
  public create(fieldPath: FieldPath): FormArray {
    return new FormArrayController(this.store, this.keys, fieldPath);
  }
}
