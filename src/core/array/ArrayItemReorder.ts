/**
 * 이전 배열 index를 다음 배열 index로 변환하는 함수다.
 *
 * @returns item이 삭제되어 더 이상 존재하지 않으면 undefined.
 */
export type IndexMapper = (index: number) => number | undefined;

/**
 * 배열 순서 변경에 필요한 순수 helper다.
 *
 * @remarks
 * 값 배열과 key 배열에 같은 move/swap 규칙을 적용해야 하므로,
 * 공통 reorder 로직을 이 클래스에 모아 둔다.
 */
export class ArrayItemReorder {
  /**
   * 이전 index가 다음 배열의 어느 위치로 이동했는지 찾는 mapper를 만든다.
   *
   * @param previousLength - 변경 전 배열 길이.
   * @param nextOrder - 다음 배열 위치별 이전 index. 새 item은 -1로 표현한다.
   * @returns 이전 index를 새 index로 바꾸는 함수.
   */
  public static createIndexMapper(previousLength: number, nextOrder: readonly number[]): IndexMapper {
    const positions = new Map<number, number>();

    nextOrder.forEach((previousIndex, nextIndex) => {
      if (previousIndex >= 0 && previousIndex < previousLength) {
        positions.set(previousIndex, nextIndex);
      }
    });

    return index => positions.get(index);
  }

  /**
   * 배열의 item 하나를 fromIndex에서 toIndex로 이동한 새 배열을 반환한다.
   *
   * @param items - 원본 배열.
   * @param fromIndex - 이동할 item index.
   * @param toIndex - 이동 후 index.
   * @returns 원본을 변경하지 않은 새 배열.
   */
  public static moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
    const nextItems = [...items];
    const [item] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, item);
    return nextItems;
  }

  /**
   * 배열의 두 item 위치를 바꾼 새 배열을 반환한다.
   *
   * @param items - 원본 배열.
   * @param leftIndex - 첫 번째 index.
   * @param rightIndex - 두 번째 index.
   * @returns 원본을 변경하지 않은 새 배열.
   */
  public static swapItems<T>(items: readonly T[], leftIndex: number, rightIndex: number): T[] {
    const nextItems = [...items];
    const left = nextItems[leftIndex];
    nextItems[leftIndex] = nextItems[rightIndex];
    nextItems[rightIndex] = left;
    return nextItems;
  }
}
