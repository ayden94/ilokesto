/**
 * 런타임에 추가되는 배열 item의 안정적인 key를 만든다.
 *
 * @remarks
 * initialValues에서 온 item은 FormStateInitializer가 `initial-${index}` key를 만들고,
 * 사용자 명령으로 추가되는 item은 이 generator가 `item-${n}` key를 만든다.
 */
export class ArrayKeyGenerator {
  /** 다음 key에 사용할 증가 숫자다. */
  private id = 0;

  /**
   * 새 배열 item key를 만든다.
   *
   * @returns `item-1`, `item-2`처럼 form 인스턴스 안에서 증가하는 key.
   */
  public create(): string {
    this.id += 1;
    return `item-${this.id}`;
  }
}
