import { StandardSchemaValidator, type StandardSchemaValidationResult } from './StandardSchemaValidator';
import type { FormStateStore } from '../state/index';
import type { CreateFormOptions, FieldSchemaOptions, FormError, PathKey, ValidationTrigger } from '../types';

/**
 * Standard Schema validation 실행을 담당하는 엔진이다.
 *
 * @remarks
 * 이 form core는 검증 규칙을 직접 갖지 않는다.
 * Standard Schema compatible schema가 있으면 {@link StandardSchemaValidator}를 통해 전체 form values를 검증하고,
 * 결과 issue를 field errors로 기록한다.
 */
export class ValidationEngine<TValues> {
  /** validateOn이 지정되지 않았을 때 submit에서만 자동 검증하도록 하는 기본값이다. */
  private static readonly DEFAULT_VALIDATE_ON: readonly ValidationTrigger[] = ['submit'];

  /** validation 대상 field value와 errors를 읽고 쓰는 저장소다. */
  private readonly store: FormStateStore<TValues>;
  /** Standard Schema compatible schema를 실행하고 issue를 field errors로 바꾸는 adapter다. */
  private readonly schema?: StandardSchemaValidator<TValues>;
  /** field별로 form-level schema보다 우선 적용할 schema validator다. */
  private readonly fieldSchemas = new Map<PathKey, RegisteredFieldSchema>();
  /** 어떤 trigger에서 자동 validation을 실행할지 나타내는 설정이다. */
  private readonly validateOn: readonly ValidationTrigger[];
  /** field schema cleanup이 최신 등록만 제거하도록 구분하는 증가 id다. */
  private nextFieldSchemaId = 0;
  /** async validation race condition 방지용 generation counter다. 새 검증이 시작될 때마다 증가하며, stale 검증 결과는 폐기된다. */
  private validationGeneration = 0;

  /**
   * validation engine을 만든다.
   *
   * @param store - schema가 읽고 error를 기록할 form state store.
   * @param options - schema와 validateOn 설정을 포함한 form 생성 옵션.
   */
  public constructor(store: FormStateStore<TValues>, options: CreateFormOptions<TValues>) {
    this.store = store;
    this.schema = options.schema ? new StandardSchemaValidator(options.schema, options.schemaOptions) : undefined;
    this.validateOn = options.validateOn ?? ValidationEngine.DEFAULT_VALIDATE_ON;
  }

  /**
   * 특정 trigger에서 자동 검증을 실행해야 하는지 확인한다.
   *
   * @param trigger - change, blur, submit, manual 중 검사할 trigger.
   * @returns validateOn에 trigger가 포함되어 있으면 true.
   */
  public shouldValidateOn(trigger: ValidationTrigger): boolean {
    return this.validateOn.includes(trigger);
  }

  /**
   * field-local schema를 등록한다.
   *
   * @remarks
   * 같은 field에 새 schema가 등록되면 마지막 등록이 우선한다.
   * 반환된 cleanup은 자신이 등록한 schema가 여전히 최신일 때만 제거한다.
   */
  public registerFieldSchema(fieldKey: PathKey, options: FieldSchemaOptions): () => void {
    const id = ++this.nextFieldSchemaId;

    this.fieldSchemas.set(fieldKey, {
      id,
      validator: new StandardSchemaValidator(options.schema, options.schemaOptions),
    });

    return () => {
      if (this.fieldSchemas.get(fieldKey)?.id === id) {
        this.fieldSchemas.delete(fieldKey);
      }
    };
  }

  /**
   * 전체 schema를 실행한 뒤 한 field의 error만 갱신한다.
   *
   * @param fieldKey - 검증할 field의 내부 PathKey.
   * @param trigger - validation trigger. schema에는 전달하지 않고 호출 의도 기록용으로만 받는다.
   * @returns 해당 field에 errors가 하나도 없으면 true.
   */
  public async validateField(fieldKey: PathKey, _trigger: ValidationTrigger): Promise<boolean> {
    const generation = ++this.validationGeneration;
    const fieldSchemaErrors = await this.validateFieldSchema(fieldKey);

    if (this.isStale(generation)) {
      return true;
    }

    if (fieldSchemaErrors) {
      this.applyErrors([fieldKey], { [fieldKey]: fieldSchemaErrors });
      return fieldSchemaErrors.length === 0;
    }

    const schemaResult = await this.validateSchema();

    if (this.isStale(generation)) {
      return true;
    }

    this.applyErrors([fieldKey], schemaResult.errorsByKey);
    return (schemaResult.errorsByKey[fieldKey] ?? []).length === 0;
  }

  /**
   * 전체 schema를 실행한 뒤 요청된 field들의 error만 갱신한다.
   *
   * @param fieldKeys - 검증할 field key 목록.
   * @param trigger - validation trigger. schema에는 전달하지 않고 호출 의도 기록용으로만 받는다.
   * @returns 요청된 field들이 모두 valid이면 true.
   */
  public async validateFields(fieldKeys: readonly PathKey[], _trigger: ValidationTrigger): Promise<boolean> {
    const generation = ++this.validationGeneration;
    const targetFieldKeys = ValidationEngine.unique(fieldKeys);

    if (targetFieldKeys.length === 0) {
      return this.validateRegisteredFields('manual');
    }

    const localErrorsByKey = await this.validateFieldSchemas(targetFieldKeys);

    if (this.isStale(generation)) {
      return true;
    }

    const formSchemaFieldKeys = targetFieldKeys.filter(fieldKey => !this.fieldSchemas.has(fieldKey));
    const schemaResult = formSchemaFieldKeys.length > 0
      ? await this.validateSchema()
      : ValidationEngine.createValidSchemaResult();

    if (this.isStale(generation)) {
      return true;
    }

    const errorsByKey = this.mergeErrorsByKey(schemaResult.errorsByKey, localErrorsByKey);

    this.applyErrors([...formSchemaFieldKeys, ...Object.keys(localErrorsByKey)], errorsByKey);

    return targetFieldKeys.every(fieldKey => (errorsByKey[fieldKey] ?? []).length === 0);
  }

  /**
   * 전체 schema를 실행하고 관련 field errors를 모두 갱신한다.
   *
   * @param trigger - validation trigger. schema에는 전달하지 않고 호출 의도 기록용으로만 받는다.
   * @returns schema validation이 성공하면 true.
   */
  public async validateRegisteredFields(_trigger: ValidationTrigger): Promise<boolean> {
    const generation = ++this.validationGeneration;
    const schemaResult = await this.validateSchema();

    if (this.isStale(generation)) {
      return true;
    }

    const localErrorsByKey = await this.validateRegisteredFieldSchemas();

    if (this.isStale(generation)) {
      return true;
    }

    const errorsByKey = this.mergeErrorsByKey(schemaResult.errorsByKey, localErrorsByKey);
    const keysToWrite = this.getValidationWriteKeys(errorsByKey);

    this.applyErrors(keysToWrite, errorsByKey);

    return keysToWrite.every(fieldKey => (errorsByKey[fieldKey] ?? []).length === 0);
  }

  /**
   * Standard Schema가 있으면 전체 form values를 검증한다.
   *
   * @returns schema가 없으면 성공 결과, 있으면 schema validation 결과.
   */
  private validateSchema(): Promise<StandardSchemaValidationResult> {
    if (!this.schema) {
      return Promise.resolve(ValidationEngine.createValidSchemaResult());
    }

    return this.schema.validate(this.store.getValues());
  }

  /** 주어진 generation이 현재 validationGeneration과 다르면, 즉 stale 검증이면 true를 반환한다. */
  private isStale(generation: number): boolean {
    return generation !== this.validationGeneration;
  }

  /**
   * validation 결과를 store에 기록한다.
   *
   * @param fieldKeys - errors를 교체할 field key 목록.
   * @param errorsByKey - field key별 errors.
   */
  private applyErrors(fieldKeys: readonly PathKey[], errorsByKey: Readonly<Record<PathKey, readonly FormError[]>>): void {
    fieldKeys.forEach(fieldKey => {
      this.store.setErrorsByKey(fieldKey, errorsByKey[fieldKey] ?? []);
    });
  }

  /** field-local schema가 있으면 해당 field value를 검증한다. */
  private async validateFieldSchema(fieldKey: PathKey): Promise<FormError[] | undefined> {
    const fieldSchema = this.fieldSchemas.get(fieldKey);

    if (!fieldSchema) {
      return undefined;
    }

    return fieldSchema.validator.validateValue(this.store.getFieldStateByKey(fieldKey).value);
  }

  /** 지정된 field들 중 field-local schema가 등록된 field만 검증한다. */
  private async validateFieldSchemas(fieldKeys: readonly PathKey[]): Promise<Record<PathKey, FormError[]>> {
    const errorsByKey: Record<PathKey, FormError[]> = {};

    await Promise.all(fieldKeys.map(async fieldKey => {
      const errors = await this.validateFieldSchema(fieldKey);

      if (errors) {
        errorsByKey[fieldKey] = errors;
      }
    }));

    return errorsByKey;
  }

  /** 등록된 모든 field-local schema를 검증한다. */
  private validateRegisteredFieldSchemas(): Promise<Record<PathKey, FormError[]>> {
    return this.validateFieldSchemas([...this.fieldSchemas.keys()]);
  }

  /**
   * form-level schema 결과에 field-local schema 결과를 덮어쓴다.
   *
   * @remarks
   * field-local schema가 등록된 field는 valid 결과([])까지도 form-level error보다 우선한다.
   */
  private mergeErrorsByKey(
    formErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
    fieldErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
  ): Record<PathKey, FormError[]> {
    const merged = Object.entries(formErrorsByKey).reduce<Record<PathKey, FormError[]>>((errorsByKey, [fieldKey, errors]) => {
      if (!this.fieldSchemas.has(fieldKey)) {
        errorsByKey[fieldKey] = [...errors];
      }

      return errorsByKey;
    }, {});

    Object.entries(fieldErrorsByKey).forEach(([fieldKey, errors]) => {
      merged[fieldKey] = [...errors];
    });

    return merged;
  }

  /**
   * 전체 validation 결과를 기록할 key 목록을 만든다.
   *
   * @remarks
   * 이전 schema error가 남아 있던 field도 clear해야 하므로 현재 store의 field key를 포함한다.
   *
   * @param schemaErrorsByKey - schema issue가 발생한 key 목록.
   * @returns errors를 교체할 key 목록.
   */
  private getValidationWriteKeys(
    schemaErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
  ): PathKey[] {
    return ValidationEngine.unique([...Object.keys(this.store.getState().fields), ...Object.keys(schemaErrorsByKey)]);
  }

  /**
   * 입력 순서를 유지하며 중복 field key를 제거한다.
   *
   * @param fieldKeys - 중복이 있을 수 있는 field key 목록.
   * @returns 중복 제거된 field key 목록.
   */
  private static unique(fieldKeys: readonly PathKey[]): PathKey[] {
    return [...new Set(fieldKeys)];
  }

  /** schema가 없거나 실행할 필요가 없을 때 쓰는 빈 성공 결과다. */
  private static createValidSchemaResult(): StandardSchemaValidationResult {
    return {
      valid: true,
      errorsByKey: {},
    };
  }
}

type RegisteredFieldSchema = {
  id: number;
  validator: StandardSchemaValidator<unknown>;
};
