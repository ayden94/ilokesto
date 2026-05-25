import { FormPath } from '../path/index.js';
import type { FieldPath, FieldPathSegment, FormError, PathKey, StandardSchemaV1 } from '../types.js';

/**
 * Standard Schema v1 compatible schema를 core validation 결과로 변환한다.
 *
 * @remarks
 * 이 클래스는 Zod, Valibot 같은 특정 library를 알지 않는다.
 * 오직 Standard Schema의 `~standard.validate(value, options)` 계약만 사용한다.
 */
export class StandardSchemaValidator<TValues> {
  /**
   * schema와 validate options를 보관한다.
   *
   * @param schema - Standard Schema v1 compatible schema.
   * @param options - schema library에 전달할 표준 validate 옵션.
   */
  public constructor(
    private readonly schema: StandardSchemaV1<unknown, TValues>,
    private readonly options?: StandardSchemaV1.Options,
  ) {}

  /**
   * 전체 form values를 schema로 검증하고 issue를 field errors로 묶는다.
   *
   * @param values - 현재 form values.
   * @returns schema가 valid인지와 PathKey별 FormError 목록.
   */
  public async validate(values: TValues): Promise<StandardSchemaValidationResult> {
    const result = await this.schema['~standard'].validate(values, this.options);

    if (!result.issues) {
      return {
        valid: true,
        errorsByKey: {},
      };
    }

    return {
      valid: false,
      errorsByKey: result.issues.reduce<Record<PathKey, FormError[]>>((errorsByKey, issue) => {
        const fieldKey = FormPath.pathToKey(StandardSchemaValidator.issuePathToFieldPath(issue.path));
        errorsByKey[fieldKey] = [
          ...(errorsByKey[fieldKey] ?? []),
          {
            type: 'standard_schema',
            message: issue.message,
          },
        ];
        return errorsByKey;
      }, {}),
    };
  }

  /**
   * Standard Schema issue path를 core FieldPath로 변환한다.
   *
   * @remarks
   * Standard Schema path segment는 PropertyKey 또는 `{ key }` 형태일 수 있다.
   * core FieldPath는 string/number만 지원하므로 symbol 등 표현할 수 없는 segment가 있으면 root error로 돌린다.
   *
   * @param issuePath - Standard Schema issue path.
   * @returns core에서 사용하는 FieldPath.
   */
  private static issuePathToFieldPath(issuePath: StandardSchemaV1.Issue['path']): FieldPath {
    if (!issuePath || issuePath.length === 0) {
      return [];
    }

    const fieldPath: FieldPathSegment[] = [];

    for (const segment of issuePath) {
      const key = StandardSchemaValidator.issuePathSegmentToKey(segment);

      if (key === undefined) {
        return [];
      }

      fieldPath.push(key);
    }

    return fieldPath;
  }

  /**
   * Standard Schema path segment 하나를 core path segment로 변환한다.
   *
   * @param segment - PropertyKey 또는 `{ key }` 형태의 path segment.
   * @returns string/number key면 그대로 반환하고, symbol처럼 표현할 수 없으면 undefined.
   */
  private static issuePathSegmentToKey(segment: PropertyKey | StandardSchemaV1.PathSegment): FieldPathSegment | undefined {
    const key = typeof segment === 'object' ? segment.key : segment;

    if (typeof key === 'string' || typeof key === 'number') {
      return key;
    }

    return undefined;
  }
}

/**
 * Standard Schema validation을 core가 사용할 수 있게 정규화한 결과다.
 */
export type StandardSchemaValidationResult = {
  /** schema validation 전체가 성공했는지 여부다. */
  valid: boolean;
  /** PathKey별로 묶은 FormError 목록이다. */
  errorsByKey: Record<PathKey, FormError[]>;
};
