import type { JSX } from 'react';
import type { ModalAdapterProps } from '../shared/types';
import { ModalAdapterInline } from './ModalAdapterInline';
import { ModalAdapterTopLayer } from './ModalAdapterTopLayer';

export function ModalAdapter<TResult>(props: ModalAdapterProps<TResult>): JSX.Element {
  const { transport = 'inline' } = props;

  if (transport === 'top-layer') {
    return <ModalAdapterTopLayer {...props} />;
  }

  return <ModalAdapterInline {...props} />;
}
