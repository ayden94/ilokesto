import type { OverlayRenderProps } from '@ilokesto/overlay';

export type ModalClose<TResult = unknown> = (result?: TResult) => void;

export type ModalCloseHandler<TResult = unknown> = (result?: TResult) => void;

export interface ModalRenderContext<TResult = unknown> {
  id: string;
  status: 'open' | 'closing';
  isOpen: boolean;
  close: ModalClose<TResult>;
}

export type ModalRender<TResult = unknown> = (
  close: ModalClose<TResult>,
  context: ModalRenderContext<TResult>
) => React.ReactNode;

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

interface ModalBaseProps<TResult = unknown> {
  transport?: 'inline' | 'top-layer';
  position?: ModalPosition;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  onModalClose?: ModalCloseHandler<TResult>;
  className?: string;
  style?: React.CSSProperties;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export type ModalProps<TResult = unknown> = ModalBaseProps<TResult> & {
  render: ModalRender<TResult>;
};

export type ModalAdapterProps<TResult = unknown> = OverlayRenderProps<TResult> & ModalProps<TResult>;
