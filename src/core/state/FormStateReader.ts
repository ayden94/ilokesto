import { FieldStateFactory } from './FieldStateFactory';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FieldPathInput, FieldState, FormState, PathKey } from '../types';

/**
 * FormState의 읽기 전용 파생값을 담당한다.
 *
 * store 자체를 직접 들고 있지 않고 snapshot getter만 받아서,
 * 값 읽기와 전체 values 복원을 순수한 읽기 책임으로 분리한다.
 */
export class FormStateReader<TValues> {
  /** getSnapshot은 호출 시점의 최신 FormState를 반환해야 한다. */
  public constructor(private readonly getSnapshot: () => Readonly<FormState<TValues>>) {}

  /**
   * fields 객체의 key들을 FieldPath로 되돌린다.
   *
   * ValueHelper.getValuesFromFields는 field value를 nested object로 복원할 때
   * 각 PathKey가 실제로 어떤 tuple path였는지 알아야 한다.
   */
  public getKnownFieldPaths(): Record<PathKey, FieldPath> {
    return Object.keys(this.getSnapshot().fields).reduce<Record<PathKey, FieldPath>>((paths, key) => {
      paths[key] = FormPath.keyToPath(key);
      return paths;
    }, {});
  }

  /** key로 FieldState를 읽고, 없는 key라면 default FieldState를 반환해 caller가 undefined 처리를 하지 않게 한다. */
  public getFieldStateByKey(fieldKey: PathKey): Readonly<FieldState> {
    return this.getSnapshot().fields[fieldKey] ?? FieldStateFactory.createDefault();
  }

  /** public path input을 PathKey로 바꾼 뒤 FieldState를 읽는다. */
  public getFieldState(fieldPath: FieldPathInput): Readonly<FieldState> {
    return this.getFieldStateByKey(FormPath.pathInputToKey(fieldPath));
  }

  /** FieldState에서 value만 꺼내는 편의 메서드다. */
  public getValue(fieldPath: FieldPathInput): unknown {
    return this.getFieldState(fieldPath).value;
  }

  /** 현재 FormState를 사용자가 넘긴 initialValues와 같은 nested 구조로 복원한다. */
  public getValues(): TValues {
    return ValueHelper.getValuesFromFields(this.getSnapshot(), this.getKnownFieldPaths());
  }

  /** 복원된 values에서 FieldPath가 가리키는 nested 값을 읽는다. */
  public getValueAtPath(fieldPath: FieldPath): unknown {
    return ValueHelper.getValueAtPath(this.getValues(), fieldPath);
  }
}
