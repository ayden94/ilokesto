import type { PathKey } from '../types';

type FullValidationToken = {
  readonly kind: 'full';
  readonly revision: number;
};

type FieldValidationToken = {
  readonly fullRevision: number;
  readonly kind: 'fields';
  readonly targetRevisions: ReadonlyMap<PathKey, number>;
};

export type ValidationToken = FullValidationToken | FieldValidationToken;

export class ValidationSequencer {
  private revision = 0;
  private fullRevision = 0;
  private readonly targetRevisions = new Map<PathKey, number>();

  public startFull(): ValidationToken {
    this.revision += 1;
    this.fullRevision += 1;
    return { kind: 'full', revision: this.revision };
  }

  public startFields(fieldKeys: readonly PathKey[]): ValidationToken {
    this.revision += 1;
    const targetRevisions = new Map<PathKey, number>();

    for (const fieldKey of fieldKeys) {
      const revision = (this.targetRevisions.get(fieldKey) ?? 0) + 1;
      this.targetRevisions.set(fieldKey, revision);
      targetRevisions.set(fieldKey, revision);
    }

    return {
      fullRevision: this.fullRevision,
      kind: 'fields',
      targetRevisions,
    };
  }

  public invalidateFields(fieldKeys: readonly PathKey[]): void {
    this.revision += 1;
    for (const fieldKey of fieldKeys) {
      this.targetRevisions.set(fieldKey, (this.targetRevisions.get(fieldKey) ?? 0) + 1);
    }
  }

  public isStale(token: ValidationToken): boolean {
    switch (token.kind) {
      case 'full':
        return token.revision !== this.revision;
      case 'fields':
        if (token.fullRevision !== this.fullRevision) return true;
        for (const [fieldKey, revision] of token.targetRevisions) {
          if (this.targetRevisions.get(fieldKey) !== revision) return true;
        }
        return false;
    }
  }
}
