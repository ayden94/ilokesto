import { ArrayItemReorder, type IndexMapper } from './ArrayItemReorder';

/**
 * 배열 조작 결과를 표현한다.
 *
 * @remarks
 * values와 keys는 다음 배열 상태이고, mapPreviousIndex는 이전 child field 상태를
 * 어느 새 index로 옮길지 FormArrayRebaser에 알려 준다.
 */
export type FormArrayMutation = {
  values: readonly unknown[];
  keys: readonly string[];
  mapPreviousIndex: IndexMapper;
};

/**
 * 배열 명령을 실제 다음 배열 상태로 계산하는 planner다.
 *
 * @remarks
 * 이 클래스는 store를 전혀 모르며 순수하게 배열 값, key, index mapper만 만든다.
 * 덕분에 FormArrayController는 명령 흐름만 담당하고 계산 책임은 여기로 분리된다.
 */
export class FormArrayMutationPlanner {
  /**
   * insert 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @param currentArray - 현재 배열 값.
   * @param currentKeys - 현재 배열 item key 목록.
   * @param index - 삽입 요청 index.
   * @param value - 삽입할 item value.
   * @param nextKey - 새 item에 부여할 key.
   * @returns rebase에 필요한 mutation.
   */
  public insert(
    currentArray: readonly unknown[],
    currentKeys: readonly string[],
    index: number,
    value: unknown,
    nextKey: string,
  ): FormArrayMutation {
    const boundedIndex = Math.max(0, Math.min(index, currentArray.length));
    const nextArray = [...currentArray];
    const nextKeys = [...currentKeys];
    const nextOrder = [...currentArray.keys()];

    nextArray.splice(boundedIndex, 0, value);
    nextKeys.splice(boundedIndex, 0, nextKey);
    nextOrder.splice(boundedIndex, 0, -1);

    return {
      values: nextArray,
      keys: nextKeys,
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * push 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @param currentArray - 현재 배열 값.
   * @param currentKeys - 현재 key 목록.
   * @param value - 추가할 item value.
   * @param nextKey - 새 item key.
   * @returns rebase에 필요한 mutation.
   */
  public push(currentArray: readonly unknown[], currentKeys: readonly string[], value: unknown, nextKey: string): FormArrayMutation {
    return {
      values: [...currentArray, value],
      keys: [...currentKeys, nextKey],
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, [...currentArray.keys(), -1]),
    };
  }

  /**
   * remove 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @param currentArray - 현재 배열 값.
   * @param currentKeys - 현재 key 목록.
   * @param index - 제거할 index.
   * @returns 유효하지 않은 index면 undefined, 아니면 mutation.
   */
  public remove(currentArray: readonly unknown[], currentKeys: readonly string[], index: number): FormArrayMutation | undefined {
    if (index < 0 || index >= currentArray.length) {
      return undefined;
    }

    const nextOrder = [...currentArray.keys()].filter(itemIndex => itemIndex !== index);

    return {
      values: currentArray.filter((_, itemIndex) => itemIndex !== index),
      keys: currentKeys.filter((_, itemIndex) => itemIndex !== index),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * move 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @param currentArray - 현재 배열 값.
   * @param currentKeys - 현재 key 목록.
   * @param fromIndex - 이동할 기존 index.
   * @param toIndex - 이동 후 index.
   * @returns 유효하지 않은 index거나 같은 위치면 undefined, 아니면 mutation.
   */
  public move(currentArray: readonly unknown[], currentKeys: readonly string[], fromIndex: number, toIndex: number): FormArrayMutation | undefined {
    if (fromIndex < 0 || fromIndex >= currentArray.length || toIndex < 0 || toIndex >= currentArray.length || fromIndex === toIndex) {
      return undefined;
    }

    const nextOrder = ArrayItemReorder.moveItem([...currentArray.keys()], fromIndex, toIndex);

    return {
      values: ArrayItemReorder.moveItem(currentArray, fromIndex, toIndex),
      keys: ArrayItemReorder.moveItem(currentKeys, fromIndex, toIndex),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * swap 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @param currentArray - 현재 배열 값.
   * @param currentKeys - 현재 key 목록.
   * @param leftIndex - 첫 번째 index.
   * @param rightIndex - 두 번째 index.
   * @returns 유효하지 않은 index거나 같은 위치면 undefined, 아니면 mutation.
   */
  public swap(currentArray: readonly unknown[], currentKeys: readonly string[], leftIndex: number, rightIndex: number): FormArrayMutation | undefined {
    if (
      leftIndex < 0 ||
      rightIndex < 0 ||
      leftIndex >= currentArray.length ||
      rightIndex >= currentArray.length ||
      leftIndex === rightIndex
    ) {
      return undefined;
    }

    const nextOrder = ArrayItemReorder.swapItems([...currentArray.keys()], leftIndex, rightIndex);

    return {
      values: ArrayItemReorder.swapItems(currentArray, leftIndex, rightIndex),
      keys: ArrayItemReorder.swapItems(currentKeys, leftIndex, rightIndex),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * replace 이후의 배열 값, key, index mapper를 계산한다.
   *
   * @remarks
   * replace는 기존 item과의 연결을 끊는 명령이므로 이전 index를 새 index로 매핑하지 않는다.
   *
   * @param values - 새 배열 값.
   * @param nextKeys - 새 item key 목록.
   * @returns rebase에 필요한 mutation.
   */
  public replace(values: readonly unknown[], nextKeys: readonly string[]): FormArrayMutation {
    return {
      values: [...values],
      keys: [...nextKeys],
      mapPreviousIndex: () => undefined,
    };
  }
}
