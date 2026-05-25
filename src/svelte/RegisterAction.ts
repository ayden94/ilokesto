import type { Action } from 'svelte/action';
import type { Form } from '../core/index';
import { createDomBinding, fieldPathToDomName, getFieldState, type FieldEventTarget, type RegisterOptions } from '../adapters/dom';

/** Svelte `use:register` action을 만든다. */
export function createRegisterAction<TValues>(form: Form<TValues>): Action<HTMLElement, RegisterOptions> {
  return (node, initialOptions) => {
    let options = initialOptions;
    let cleanupSchema = registerSchema(form, options);

    const getBinding = () => createDomBinding(
      form,
      resolveOptionsFromNode(node, options),
      () => getFieldState(form, form.getState(), options.name),
      fieldPathToDomName(options.name),
    );

    const syncNode = () => {
      applyBindingToNode(node, getBinding(), options);
    };

    const onInput = (event: Event) => {
      getBinding().input(event.currentTarget as FieldEventTarget);
    };
    const onChange = (event: Event) => {
      getBinding().change(event.currentTarget as FieldEventTarget);
    };
    const onBlur = () => {
      getBinding().blur();
    };
    const onFocus = () => {
      getBinding().focus();
    };

    node.addEventListener('input', onInput);
    node.addEventListener('change', onChange);
    node.addEventListener('blur', onBlur);
    node.addEventListener('focus', onFocus);

    const unsubscribe = form.subscribe(syncNode);
    syncNode();

    return {
      update(nextOptions) {
        cleanupSchema();
        options = nextOptions;
        cleanupSchema = registerSchema(form, options);
        syncNode();
      },
      destroy() {
        unsubscribe();
        cleanupSchema();
        node.removeEventListener('input', onInput);
        node.removeEventListener('change', onChange);
        node.removeEventListener('blur', onBlur);
        node.removeEventListener('focus', onFocus);
      },
    };
  };
}

type BindingSnapshot = ReturnType<typeof createDomBinding>;

function registerSchema<TValues>(form: Form<TValues>, options: RegisterOptions): () => void {
  if (!options.schema) {
    return () => undefined;
  }

  return form.registerFieldSchema(options.name, { schema: options.schema, schemaOptions: options.schemaOptions });
}

function resolveOptionsFromNode(node: HTMLElement, options: RegisterOptions): RegisterOptions {
  if (options.type !== undefined || !(node instanceof HTMLInputElement)) {
    return options;
  }

  return {
    ...options,
    type: node.type || 'text',
  };
}

function applyBindingToNode(node: HTMLElement, binding: BindingSnapshot, options: RegisterOptions): void {
  setNodeName(node, binding.name);

  if (node instanceof HTMLInputElement) {
    applyInputBinding(node, binding, options);
    return;
  }

  if (node instanceof HTMLSelectElement) {
    applySelectBinding(node, binding);
    return;
  }

  if (node instanceof HTMLTextAreaElement) {
    setStringValue(node, binding.value);
    return;
  }

  applyCustomBinding(node, binding);
}

function setNodeName(node: HTMLElement, name: string): void {
  if ('name' in node) {
    (node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name = name;
    return;
  }

  node.setAttribute('name', name);
}

function applyInputBinding(node: HTMLInputElement, binding: BindingSnapshot, options: RegisterOptions): void {
  if (options.type !== undefined && node.type !== options.type) {
    node.type = options.type;
  }

  if (node.type === 'checkbox' || node.type === 'radio') {
    if (binding.value !== undefined) {
      node.value = String(Array.isArray(binding.value) ? binding.value[0] : binding.value);
    }

    node.checked = Boolean(binding.checked);
    return;
  }

  setStringValue(node, binding.value);
}

function applySelectBinding(node: HTMLSelectElement, binding: BindingSnapshot): void {
  const value = binding.value;

  if (node.multiple) {
    const values = new Set((Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String));
    Array.from(node.options).forEach(option => {
      option.selected = values.has(option.value);
    });
    return;
  }

  setStringValue(node, value);
}

function setStringValue(node: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: BindingSnapshot['value']): void {
  const nextValue = value === undefined ? '' : String(Array.isArray(value) ? value[0] ?? '' : value);

  if (node.value !== nextValue) {
    node.value = nextValue;
  }
}

function applyCustomBinding(node: HTMLElement, binding: BindingSnapshot): void {
  if ('value' in node) {
    (node as HTMLElement & { value: unknown }).value = binding.value;
  }

  if ('checked' in node) {
    (node as HTMLElement & { checked: boolean }).checked = Boolean(binding.checked);
  }
}
