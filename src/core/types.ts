/** 정규화된 form field path의 단일 segment다. */
export type FieldPathSegment = string | number;

/** framework와 무관하게 nested field를 표현하는 tuple path다. */
export type FieldPath = readonly FieldPathSegment[];

/**
 * public API가 받을 수 있는 field path 입력이다.
 *
 * @remarks
 * string은 dot path로 파싱하지 않고 하나의 field 이름으로 취급한다.
 * nested field를 가리키려면 tuple path를 사용한다.
 */
export type FieldPathInput = string | FieldPath;

/** FieldPath를 object key로 쓰기 위해 변환한 안정적인 문자열 key다. */
export type PathKey = string;

/** field에 붙는 validation error 정보다. */
export type FormError = {
  /** `required`, `pattern`처럼 기계적으로 분기할 수 있는 error category다. */
  type?: string;
  /** 사용자에게 보여주거나 개발자가 읽을 수 있는 error message다. */
  message: string;
};

/** validation을 실행하게 만든 trigger 종류다. */
export type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';

/**
 * Standard Schema v1의 최소 인터페이스다.
 *
 * @remarks
 * Zod, Valibot처럼 Standard Schema를 구현한 외부 schema library를
 * core가 직접 의존하지 않고 받아들이기 위한 계약이다.
 *
 * @see https://standardschema.dev/
 */
export type StandardSchemaV1<Input = unknown, Output = Input> = {
  /** Standard Schema 구현체가 노출하는 표준 속성이다. */
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
};

/** Standard Schema v1 관련 하위 타입 namespace다. */
export declare namespace StandardSchemaV1 {
  /** `~standard` 아래에 존재하는 schema metadata와 validate 함수다. */
  export type Props<Input = unknown, Output = Input> = {
    /** Standard Schema major version이다. */
    readonly version: 1;
    /** schema library vendor 이름이다. */
    readonly vendor: string;
    /** schema가 가진 input/output 타입 정보다. 런타임에는 없을 수 있다. */
    readonly types?: Types<Input, Output> | undefined;
    /** unknown input을 검증하고 성공 value 또는 failure issues를 반환한다. */
    readonly validate: (value: unknown, options?: Options | undefined) => Result<Output> | Promise<Result<Output>>;
  };

  /** Standard Schema가 가진 input/output 타입 phantom field다. */
  export type Types<Input = unknown, Output = Input> = {
    /** schema input 타입이다. */
    readonly input: Input;
    /** schema output 타입이다. */
    readonly output: Output;
  };

  /** validate 함수에 넘길 수 있는 표준 옵션이다. */
  export type Options = {
    /** library별 추가 옵션을 전달하기 위한 escape hatch다. */
    readonly libraryOptions?: Record<string, unknown> | undefined;
  };

  /** validate 성공 또는 실패 결과다. */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /** validate 성공 결과다. */
  export type SuccessResult<Output> = {
    /** schema가 검증하고 변환한 output value다. */
    readonly value: Output;
    /** falsy issues는 성공을 의미한다. */
    readonly issues?: undefined;
  };

  /** validate 실패 결과다. */
  export type FailureResult = {
    /** 검증 실패 issue 목록이다. */
    readonly issues: readonly Issue[];
  };

  /** Standard Schema 검증 실패 issue다. */
  export type Issue = {
    /** issue message다. */
    readonly message: string;
    /** issue가 가리키는 path다. 없거나 비어 있으면 root error로 처리한다. */
    readonly path?: readonly (PropertyKey | PathSegment)[] | undefined;
  };

  /** path segment를 object로 표현할 때 사용하는 형태다. */
  export type PathSegment = {
    /** 실제 path segment key다. */
    readonly key: PropertyKey;
  };
}

/** 하나의 input field가 소유하는 최소 상태다. */
export type FieldState<TValue = unknown> = {
  /** 현재 field value다. */
  value: TValue;
  /** 현재 field에 붙어 있는 validation errors다. */
  errors: FormError[];
  /** field가 한 번 이상 blur 되었는지 여부다. */
  touched: boolean;
  /** 현재 값이 initial value와 다른지 여부다. */
  dirty: boolean;
  /** 사용자가 field를 한 번 이상 변경했는지 여부다. */
  modified: boolean;
};

/** 배열 field의 안정적인 render key 목록이다. array path key를 기준으로 저장된다. */
export type ArrayKeys = Record<PathKey, string[]>;

/** form 인스턴스가 저장하는 전체 내부 snapshot이다. */
export type FormState<TValues> = {
  /** form 초기화에 사용한 원본 values다. reset 기준값으로도 사용된다. */
  initialValues: TValues;
  /** 정규화된 path key로 저장한 field states다. */
  fields: Record<PathKey, FieldState>;
  /** form controller를 통해 submit을 시도한 횟수다. */
  submitCount: number;
  /** 배열 field별 안정적인 item key 목록이다. */
  arrayKeys: ArrayKeys;
};

/** form 인스턴스를 만들 때 필요한 옵션이다. */
export type CreateFormOptions<TValues> = {
  /** field store를 초기화할 initial values다. */
  initialValues: TValues;
  /**
   * 전체 form values를 검증할 Standard Schema compatible schema다.
   *
   * @remarks
   * core는 Zod/Valibot을 직접 import하지 않고, `~standard.validate` 계약만 사용한다.
   */
  schema?: StandardSchemaV1<unknown, TValues>;
  /** Standard Schema validate 함수에 넘길 옵션이다. */
  schemaOptions?: StandardSchemaV1.Options;
  /** 자동 validation을 실행할 trigger 목록이다. */
  validateOn?: readonly ValidationTrigger[];
};

/** 특정 field에 form-level schema보다 우선 적용할 validation schema 설정이다. */
export type FieldSchemaOptions = {
  /** field value 하나를 검증할 Standard Schema compatible schema다. */
  schema: StandardSchemaV1<unknown, unknown>;
  /** 이 field schema validate 함수에 넘길 옵션이다. */
  schemaOptions?: StandardSchemaV1.Options;
};

/**
 * 외부 store를 기반으로 동작하는 최소 form 인스턴스 API다.
 *
 * @remarks
 * framework adapter는 이 interface만 의존하면 core 구현을 직접 몰라도 form을 사용할 수 있다.
 */
export type Form<TValues> = {
  /** 최신 immutable form snapshot을 반환한다. */
  getState(): Readonly<FormState<TValues>>;
  /** form store 변경을 구독한다. */
  subscribe(listener: () => void): () => void;
  /** 특정 field에 form-level schema보다 우선하는 field-local schema를 등록한다. */
  registerFieldSchema(path: FieldPathInput, options: FieldSchemaOptions): () => void;
  /** field state 하나를 반환한다. 존재하지 않으면 읽기용 기본 shape을 반환한다. */
  getFieldState(path: FieldPathInput): Readonly<FieldState>;
  /** field value 하나를 반환한다. */
  getValue(path: FieldPathInput): unknown;
  /** field states에서 복원한 전체 values를 반환한다. */
  getValues(): TValues;
  /** field value와 dirty/modified 메타데이터를 갱신한다. */
  setValue(path: FieldPathInput, value: unknown, options?: SetValueOptions): void;
  /** field를 touched 처리하고 필요하면 validation을 실행한다. */
  blur(path: FieldPathInput): Promise<boolean>;
  /** 현재 최소 상태 shape을 변경하지 않고 focus intent만 명령으로 노출한다. */
  focus(path: FieldPathInput): void;
  /** 한 field의 errors를 교체한다. */
  setErrors(path: FieldPathInput, errors: readonly FormError[]): void;
  /** 특정 fields 또는 path가 없을 때 전체 field errors를 비운다. */
  clearErrors(...paths: FieldPathInput[]): void;
  /** 전달한 paths 또는 생략 시 전체 form schema validation을 실행한다. */
  trigger(...paths: FieldPathInput[]): Promise<boolean>;
  /** 배열 index와 child field state를 함께 맞추는 array commands를 반환한다. */
  array(path: FieldPathInput): FormArray;
  /** initial values 또는 새 replacement initial values로 form을 reset한다. */
  reset(values?: TValues): void;
  /** form을 검증하고 submit callback을 실행한다. */
  submit<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined>;
};

/** 배열 field를 변경하면서 child field state를 rebase하는 명령 모음이다. */
export type FormArray = {
  /** 현재 배열 item들의 안정적인 render key를 반환한다. */
  keys(): readonly string[];
  /** index 위치에 item 하나를 삽입한다. */
  insert(index: number, value: unknown): void;
  /** 배열 끝에 item 하나를 추가한다. */
  push(value: unknown): void;
  /** index 위치의 item 하나를 제거한다. */
  remove(index: number): void;
  /** item 하나를 한 index에서 다른 index로 이동한다. */
  move(fromIndex: number, toIndex: number): void;
  /** 두 item index를 서로 교환한다. */
  swap(leftIndex: number, rightIndex: number): void;
  /** 배열 전체를 교체하고 해당 배열의 child field state를 새 값 기준으로 재설정한다. */
  replace(values: readonly unknown[]): void;
};

/** field value를 쓸 때 사용하는 옵션이다. */
export type SetValueOptions = {
  /** 이 write가 사용자 interaction에서 왔는지 여부다. */
  source?: 'user' | 'program';
  /** 값을 쓴 직후 해당 field를 validation할지 여부다. */
  validate?: boolean;
};
