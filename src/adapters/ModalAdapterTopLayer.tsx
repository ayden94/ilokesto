import React, { useEffect, useRef, useCallback, useId } from 'react';
import { useIsTopModal } from '../hooks/useIsTopModal';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { ModalAdapterProps, ModalPosition } from '../shared/types';

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)].find(
    (el) => el.getAttribute('aria-hidden') !== 'true'
  ) ?? null;
}

function getDialogPositionStyles(pos?: ModalPosition): React.CSSProperties {
  switch (pos) {
    case 'top': return { marginBottom: 'auto', marginTop: '2rem' };
    case 'bottom': return { marginTop: 'auto', marginBottom: '2rem' };
    case 'left': return { marginRight: 'auto', marginLeft: '2rem' };
    case 'right': return { marginLeft: 'auto', marginRight: '2rem' };
    case 'top-left': return { marginBottom: 'auto', marginRight: 'auto', margin: '2rem auto auto 2rem' };
    case 'top-right': return { marginBottom: 'auto', marginLeft: 'auto', margin: '2rem 2rem auto auto' };
    case 'bottom-left': return { marginTop: 'auto', marginRight: 'auto', margin: 'auto auto 2rem 2rem' };
    case 'bottom-right': return { marginTop: 'auto', marginLeft: 'auto', margin: 'auto 2rem 2rem auto' };
    case 'center':
    default: return { margin: 'auto' };
  }
}

function cssPropertiesToString(style: React.CSSProperties): string {
  return Object.entries(style).map(([k, v]) => {
    const kebabName = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    return `${kebabName}: ${v};`;
  }).join(' ');
}

export function ModalAdapterTopLayer<TResult>({
  id,
  isOpen,
  status,
  close,
  remove,
  render,
  position = 'center',
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  dismissible = true,
  onDismiss,
  className,
  style,
  backdropClassName,
  backdropStyle,
  autoFocus = true,
  restoreFocus = true,
}: ModalAdapterProps<TResult>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const uniqueId = useId().replace(/:/g, '');
  const isTopModal = useIsTopModal(id);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Reduced motion fast-track removal
  useEffect(() => {
    if (status === 'closing') {
      if (prefersReducedMotion) {
        const dialog = dialogRef.current;
        if (dialog && dialog.open) {
          dialog.close();
        }
        remove();
      }
    }
  }, [status, prefersReducedMotion, remove]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    if (!dialog.open) {
      dialog.showModal();
    }

    if (autoFocus) {
      const focusable = getFirstFocusableElement(dialog) ?? dialog;
      focusable.focus();
    }

    return () => {
      if (restoreFocus && previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      if (isTopModal && dismissible && status !== 'closing') {
        e.preventDefault();
        onDismiss?.();
        close();
      } else {
        e.preventDefault();
      }
    };

    const handleClick = (e: MouseEvent) => {
      // The native dialog fills the viewport, but clicking its ::backdrop counts as clicking the dialog.
      // We only close if they click exactly the dialog element (the bounds), which includes the backdrop.
      // But wait: if the dialog is purely the content, clicking the content is ALSO clicking the dialog,
      // UNLESS the content is wrapped in a child div. Wait, e.target === dialog works because
      // if they click the content, e.target is the content element or its children.
      if (isTopModal && dismissible && e.target === dialog && status !== 'closing') {
        onDismiss?.();
        close();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleClick);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleClick);
    };
  }, [close, dismissible, isTopModal, onDismiss, status]);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (status === 'closing' && e.target === e.currentTarget) {
      const dialog = dialogRef.current;
      if (dialog && dialog.open) {
        dialog.close();
      }
      remove();
    }
  }, [status, remove]);

  const isClosing = status === 'closing';
  const animationDuration = prefersReducedMotion ? '0s' : '0.2s';
  const content = render(close, { id, status, isOpen, close });
  const panelAnimation = isClosing
    ? `ilokestoModalScaleOut ${animationDuration} ease-out forwards`
    : `ilokestoModalScaleIn ${animationDuration} ease-out forwards`;

  const classes = [
    'ilokesto-modal-dialog',
    `ilokesto-modal-dialog-${uniqueId}`,
    isClosing ? 'ilokesto-modal-closing' : 'ilokesto-modal-open',
    className || ''
  ].filter(Boolean).join(' ');

  const dynamicBackdropClass = backdropClassName ? ` ${backdropClassName}` : '';

  return (
    <>
      {(backdropStyle || backdropClassName) && (
        <style>
          {`
            .ilokesto-modal-dialog-${uniqueId}::backdrop {
              ${backdropStyle ? cssPropertiesToString(backdropStyle) : ''}
            }
          `}
        </style>
      )}
      {role === 'alertdialog' ? (
        <dialog
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          tabIndex={-1}
          className={classes + dynamicBackdropClass}
          style={{
            animation: panelAnimation,
            ...getDialogPositionStyles(position),
            ...style,
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          {content}
        </dialog>
      ) : (
        <dialog
          ref={dialogRef}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          tabIndex={-1}
          className={classes + dynamicBackdropClass}
          style={{
            animation: panelAnimation,
            ...getDialogPositionStyles(position),
            ...style,
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          {content}
        </dialog>
      )}
    </>
  );
}
