export type ReducerAction = {
  readonly type: string;
};

export type ReduceFn<T, Action extends ReducerAction> = (state: T, action: Action) => T;
