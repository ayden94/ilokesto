import type { FieldPathInput, FieldState, Form } from '../../core/index';
import type { DomValue, FieldEventTarget, RegisterOptions } from './types';

const SKIP_CHANGE = Symbol('skip change');

type ChangeValue = unknown | typeof SKIP_CHANGE;

export type DomBindingCore = {
  readonly name: string;
  readonly type: string;
  readonly value?: DomValue;
  readonly checked?: boolean;
  input(target: FieldEventTarget): void;
  change(target: FieldEventTarget): void;
  blur(): void;
  focus(): void;
};

/** Framework adapter들이 공유하는 DOM binding core를 만든다. */
export function createDomBinding<TValues>(
  form: Form<TValues>,
  options: RegisterOptions,
  getField: () => Readonly<FieldState>,
  domName: string,
): DomBindingCore {
  const inputType = options.type ?? 'text';

  return {
    name: domName,
    type: inputType,
    get value() {
      return getBoundValue(inputType, getField().value, getOptionValue(options));
    },
    get checked() {
      return getBoundChecked(inputType, getField().value, getOptionValue(options));
    },
    input(target) {
      if (shouldIgnoreInputEvent(target, options)) {
        return;
      }

      commitEventValue(form, options, getField().value, target);
    },
    change(target) {
      commitEventValue(form, options, getField().value, target);
    },
    blur() {
      void form.blur(options.name);
    },
    focus() {
      form.focus(options.name);
    },
  };
}

/** core path를 DOM name 문자열로 표현한다. */
export function fieldPathToDomName(name: FieldPathInput): string {
  return typeof name === 'string' ? name : JSON.stringify(name);
}

function commitEventValue<TValues>(form: Form<TValues>, options: RegisterOptions, currentValue: unknown, target: FieldEventTarget): void {
  const nextValue = getEventValue(target, options, currentValue);

  if (nextValue !== SKIP_CHANGE) {
    form.setValue(options.name, nextValue, { source: 'user' });
  }
}

function shouldIgnoreInputEvent(target: FieldEventTarget, options: RegisterOptions): boolean {
  const type = options.type ?? target.type;

  return type === 'checkbox' || type === 'radio' || Boolean(target.multiple);
}

function getOptionValue(options: RegisterOptions): unknown {
  return options.value ?? options.checkedValue;
}

function getBoundValue(kind: string | undefined, fieldValue: unknown, optionValue: unknown): DomValue | undefined {
  if (kind === 'checkbox') {
    return toDomValue(optionValue);
  }

  if (kind === 'radio') {
    return toDomValue(optionValue) ?? '';
  }

  return toDomValue(fieldValue) ?? '';
}

function getBoundChecked(kind: string | undefined, fieldValue: unknown, optionValue: unknown): boolean | undefined {
  if (kind === 'checkbox') {
    if (optionValue !== undefined && Array.isArray(fieldValue)) {
      return fieldValue.some(item => Object.is(item, optionValue));
    }

    if (optionValue !== undefined) {
      return Object.is(fieldValue, optionValue);
    }

    return Boolean(fieldValue);
  }

  if (kind === 'radio') {
    return Object.is(fieldValue, optionValue);
  }

  return undefined;
}

function getEventValue(target: FieldEventTarget, options: RegisterOptions, currentValue: unknown): ChangeValue {
  const type = options.type ?? target.type;

  if (type === 'checkbox') {
    return getCheckboxEventValue(target, options, currentValue);
  }

  if (type === 'radio') {
    if (!target.checked) {
      return SKIP_CHANGE;
    }

    return getOptionValue(options) ?? target.value;
  }

  if (target.multiple && target.selectedOptions) {
    return [...target.selectedOptions].map(option => option.value);
  }

  return target.value;
}

function getCheckboxEventValue(target: FieldEventTarget, options: RegisterOptions, currentValue: unknown): unknown {
  if (options.checkedValue === undefined && options.value === undefined) {
    return Boolean(target.checked);
  }

  if (Array.isArray(currentValue)) {
    const optionValue = getOptionValue(options);

    if (target.checked) {
      return currentValue.some(item => Object.is(item, optionValue)) ? currentValue : [...currentValue, optionValue];
    }

    return currentValue.filter(item => !Object.is(item, optionValue));
  }

  return target.checked ? getOptionValue(options) : (options.uncheckedValue ?? false);
}

function toDomValue(value: unknown): DomValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }

  return String(value);
}
