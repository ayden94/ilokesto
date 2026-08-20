import { Children, cloneElement, forwardRef, isValidElement } from 'react';
import { composeRefs } from '../../utils/composeRefs';
import { mergeProps } from './mergeProps';
import { isSlottable } from './Slottable';

/**
 * Merges its props onto a single child element — Radix-style `asChild` pattern.
 *
 * Event handlers are chained, `className` strings are concatenated, and `style`
 * objects are shallow-merged. Refs are composed via {@link composeRefs}.
 *
 * When a {@link Slottable} child is present, the slottable descendant receives
 * the merged props while siblings render alongside it.
 */
export const Slot = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { children, ...slotProps } = props;
  const childrenArray = Children.toArray(children);
  const slottable = childrenArray.find(isSlottable);

  if (slottable) {
    // Slottable의 children을 가져와서 병합
    const slottableChild = (slottable.props as any).children;
    
    if (!isValidElement(slottableChild)) {
      return null;
    }

    const newElement = cloneElement(
      slottableChild as any,
      {
        ...mergeProps(slotProps, (slottableChild as any).props),
        ref: ref ? composeRefs(ref, (slottableChild as any).ref) : (slottableChild as any).ref,
        key: (slottable as any).key
      } as any,
    );

    const newChildren = childrenArray.map((child) => {
      if (child === slottable) {
        return newElement;
      }
      return child;
    });

    return <>{newChildren}</>;
  }

  const [child] = childrenArray;

  if (!isValidElement(child)) {
    return null;
  }

  return cloneElement(child, {
    ...mergeProps(slotProps, child.props),
    ref: ref ? composeRefs(ref, (child as any).ref) : (child as any).ref
  });
});
