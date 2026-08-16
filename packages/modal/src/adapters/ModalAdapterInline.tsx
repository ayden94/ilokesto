import React, { useEffect, useRef, useCallback } from 'react';
import { useModalStackInfo } from '../hooks/useIsTopModal';
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

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true'
  );
}

function getPositionStyles(pos?: ModalPosition): React.CSSProperties {
  switch (pos) {
    case 'top': return { alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2rem' };
    case 'bottom': return { alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2rem' };
    case 'left': return { alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '2rem' };
    case 'right': return { alignItems: 'center', justifyContent: 'flex-end', paddingRight: '2rem' };
    case 'top-left': return { alignItems: 'flex-start', justifyContent: 'flex-start', padding: '2rem' };
    case 'top-right': return { alignItems: 'flex-start', justifyContent: 'flex-end', padding: '2rem' };
    case 'bottom-left': return { alignItems: 'flex-end', justifyContent: 'flex-start', padding: '2rem' };
    case 'bottom-right': return { alignItems: 'flex-end', justifyContent: 'flex-end', padding: '2rem' };
    case 'center':
    default: return { alignItems: 'center', justifyContent: 'center' };
  }
}

let scrollLockCount = 0;
let originalBodyOverflow = '';

export function ModalAdapterInline<TResult>({
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { containsTarget, isTopModal, stackIndex } = useModalStackInfo(id, wrapperRef);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Body scroll lock
  useEffect(() => {
    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount++;
    
    return () => {
      scrollLockCount--;
      if (scrollLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }
    };
  }, []);

  // Reduced motion fast-track removal
  useEffect(() => {
    if (status === 'closing') {
      if (prefersReducedMotion) {
        remove();
      }
    }
  }, [status, prefersReducedMotion, remove]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    if (autoFocus && containerRef.current) {
      const focusable = getFocusableElements(containerRef.current)[0] ?? containerRef.current;
      focusable.focus();
    }

    return () => {
      if (restoreFocus && previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTopModal && dismissible && status !== 'closing') {
          const targetIsForeignTopLayer = e.target instanceof Element &&
            e.target.closest('.ilokesto-modal-dialog') !== null &&
            !containsTarget(e.target);

          if (!targetIsForeignTopLayer) {
            e.preventDefault();
          }
          e.stopPropagation();
          onDismiss?.();
          close();
        }
      } else if (isTopModal && e.key === 'Tab' && containerRef.current) {
        const focusables = getFocusableElements(containerRef.current);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, containsTarget, dismissible, isTopModal, onDismiss, status]);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (!isTopModal || !containerRef.current || status === 'closing') return;
      const target = e.target instanceof Node ? e.target : null;

      if (target && containerRef.current.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('.ilokesto-modal-inline-wrapper, .ilokesto-modal-dialog') &&
        !containsTarget(target)
      ) return;

      const focusable = getFocusableElements(containerRef.current)[0] ?? containerRef.current;
      focusable.focus();
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [containsTarget, isTopModal, status]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (isTopModal && dismissible && e.target === e.currentTarget && status !== 'closing') {
        onDismiss?.();
        close();
      }
    },
    [close, dismissible, isTopModal, onDismiss, status]
  );

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (status === 'closing' && e.target === e.currentTarget) {
      remove();
    }
  }, [status, remove]);

  const isClosing = status === 'closing';
  const content = render(close, { id, status, isOpen, close });

  const animationDuration = prefersReducedMotion ? '0s' : '0.2s';
  const backdropAnimation = isClosing
    ? `ilokestoModalFadeOut ${animationDuration} ease-out forwards`
    : `ilokestoModalFadeIn ${animationDuration} ease-out forwards`;
  const panelAnimation = isClosing
    ? `ilokestoModalScaleOut ${animationDuration} ease-out forwards`
    : `ilokestoModalScaleIn ${animationDuration} ease-out forwards`;

  return (
    <div
      ref={wrapperRef}
      className={`ilokesto-modal-inline-wrapper ${isClosing ? 'ilokesto-modal-closing' : 'ilokesto-modal-open'}`}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        zIndex: 10000 + stackIndex,
        ...getPositionStyles(position),
      }}
    >
      <button
        type="button"
        aria-label="Dismiss modal"
        tabIndex={-1}
        className={`ilokesto-modal-backdrop ${backdropClassName || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          padding: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          animation: backdropAnimation,
          ...backdropStyle,
        }}
        onClick={handleBackdropClick}
      />
      <div
        ref={containerRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`ilokesto-modal-panel ${className || ''}`}
        style={{
          position: 'relative',
          zIndex: 1,
          animation: panelAnimation,
          ...style,
        }}
        onAnimationEnd={handleAnimationEnd}
      >
        {content}
      </div>
    </div>
  );
}
