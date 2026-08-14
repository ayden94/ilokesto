import { Props } from "./types";


export function mergeProps(slotProps: Props, childProps: Props): Props {
  const merged = { ...childProps };

  for (const propName in slotProps) {
    const slotProp = slotProps[propName];
    const childProp = merged[propName];

    if (/^on[A-Z]/.test(propName) && typeof slotProp === 'function' && typeof childProp === 'function') {
      merged[propName] = (...args: any[]) => {
        childProp(...args);
        slotProp(...args);
      };
    } else if (propName === 'style' && typeof slotProp === 'object' && typeof childProp === 'object') {
      merged[propName] = { ...childProp, ...slotProp };
    } else if (propName === 'className' && typeof slotProp === 'string' && typeof childProp === 'string') {
      merged[propName] = [childProp, slotProp].filter(Boolean).join(' ');
    } else {
      merged[propName] = slotProp;
    }
  }

  return merged;
}
