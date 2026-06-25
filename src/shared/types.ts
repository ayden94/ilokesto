import type { OverlayRenderProps } from '@ilokesto/overlay';

export type ModalClose<TResult = unknown> = (result?: TResult) => void;

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

interface ModalBaseProps {
  transport?: 'inline' | 'top-layer';
  position?: ModalPosition;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

interface ModalChildrenProps {
  children?: React.ReactNode;
  render?: never;
}

interface ModalRenderProps<TResult = unknown> {
  children?: never;
  render: ModalRender<TResult>;
}

export type ModalProps<TResult = unknown> = ModalBaseProps &
  (ModalChildrenProps | ModalRenderProps<TResult>);

export type ModalAdapterProps<TResult = unknown> = OverlayRenderProps<TResult> & ModalProps<TResult>;

export function assertExclusiveModalContent(options: {
  children?: React.ReactNode;
  render?: ModalRender<unknown>;
}) {
  if (options.render && options.children !== undefined) {
    throw new Error('Use either render or children for modal content, not both.');
  }
}
