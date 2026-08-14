import type { JSX } from 'react';
import type { OverlayRenderProps } from '@ilokesto/overlay';
import type { ModalAdapterProps } from '../shared/types';
import { ModalAdapterInline } from './ModalAdapterInline';
import { ModalAdapterTopLayer } from './ModalAdapterTopLayer';

type ModalAdapterInput<TResult = unknown> = OverlayRenderProps<TResult> & Record<string, unknown>;
type ResolvedModalAdapterProps<TResult = unknown> = ModalAdapterInput<TResult> & ModalAdapterProps<TResult>;

function hasModalRender<TResult>(props: ModalAdapterInput<TResult>): props is ResolvedModalAdapterProps<TResult> {
  return typeof props.render === 'function';
}

export function ModalAdapter<TResult>(props: ModalAdapterInput<TResult>): JSX.Element | null {
  if (!hasModalRender(props)) {
    return null;
  }

  const { transport = 'inline' } = props;

  if (transport === 'top-layer') {
    return <ModalAdapterTopLayer {...props} />;
  }

  return <ModalAdapterInline {...props} />;
}
