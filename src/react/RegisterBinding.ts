import type { ChangeEvent, FocusEvent } from 'react';
import type { FieldPathInput, FieldState, Form } from '../core/index';
import type { RegisterOptions, RegisterProps, RegisterPropsFor } from './types';

type FieldEventTarget = HTMLElement & {
  type?: string;
  value?: unknown;
  checked?: boolean;
  multiple?: boolean;
  selectedOptions?: Iterable<{ value: string }>;
};

const SKIP_CHANGE = Symbol('skip change');

type ChangeValue = unknown | typeof SKIP_CHANGE;
type DomValue = string | number | readonly string[];

/** binding props를 생성한다. 이벤트 handler는 DOM event에서 값을 읽어 core form에 전달한다. */
export function createRegisterProps<TValues, TOptions extends RegisterOptions>(
  form: Form<TValues>,
  options: TOptions,
  field: Readonly<FieldState>,
  domName: string,
): RegisterPropsFor<TOptions> {
  const kind = options.type;
  const optionValue = getOptionValue(options);

  const props: RegisterProps = {
    name: domName,
    value: getBoundValue(kind, field.value, optionValue),
    checked: getBoundChecked(kind, field.value, optionValue),
    onChange: (event: ChangeEvent<HTMLElement>) => {
      const nextValue = getEventValue(event.currentTarget as FieldEventTarget, options, field.value);

      if (nextValue !== SKIP_CHANGE) {
        form.setValue(options.name, nextValue, { source: 'user' });
      }
    },
    onBlur: () => {
      void form.blur(options.name);
    },
    onFocus: () => {
      form.focus(options.name);
    },
  };

  return props as RegisterPropsFor<TOptions>;
}

/** core path를 DOM name 문자열로 표현한다. */
export function fieldPathToDomName(name: FieldPathInput): string {
  return typeof name === 'string' ? name : JSON.stringify(name);
}

/** radio/checkbox의 DOM option value를 결정한다. */
function getOptionValue(options: RegisterOptions): unknown {
  return options.value ?? options.checkedValue;
}

/** React controlled component에 넘길 value prop을 계산한다. */
function getBoundValue(kind: string | undefined, fieldValue: unknown, optionValue: unknown): DomValue | undefined {
  if (kind === 'checkbox') {
    return toDomValue(optionValue);
  }

  if (kind === 'radio') {
    return toDomValue(optionValue) ?? '';
  }

  return toDomValue(fieldValue) ?? '';
}

/** React controlled component에 넘길 checked prop을 계산한다. */
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

/** DOM event target에서 form에 쓸 값을 추출한다. */
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

/** checkbox는 boolean, single option, option array를 모두 지원한다. */
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
