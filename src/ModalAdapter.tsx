import type { ModalAdapterProps } from './types';
import { ModalAdapterInline } from './ModalAdapterInline';
import { ModalAdapterTopLayer } from './ModalAdapterTopLayer';

export function ModalAdapter<TResult>(props: ModalAdapterProps<TResult>) {
  const { transport = 'inline' } = props;

  if (transport === 'top-layer') {
    return <ModalAdapterTopLayer {...props} />;
  }

  return <ModalAdapterInline {...props} />;
}
