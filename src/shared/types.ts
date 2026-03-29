import type { OverlayRenderProps } from '@ilokesto/overlay';

export type ModalPosition = 
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface ModalProps {
  children?: React.ReactNode;
  transport?: 'inline' | 'top-layer';
  position?: ModalPosition;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export type ModalAdapterProps<TResult = unknown> = OverlayRenderProps<TResult> & ModalProps;
