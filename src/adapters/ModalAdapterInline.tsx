import React, { useEffect, useRef, useCallback } from 'react';
import type { ModalAdapterProps, ModalPosition } from '../shared/types';

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

export function ModalAdapterInline<TResult>({
  status,
  close,
  remove,
  children,
  position = 'center',
  dismissible = true,
  onDismiss,
  className,
  style,
  backdropClassName,
  backdropStyle,
  autoFocus = true,
  restoreFocus = true,
}: ModalAdapterProps<TResult>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    scrollLockCount++;
    const originalOverflow = document.body.style.overflow;
    if (scrollLockCount === 1) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      scrollLockCount--;
      if (scrollLockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, []);

  // Reduced motion fast-track removal
  useEffect(() => {
    if (status === 'closing') {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        remove();
      }
    }
  }, [status, remove]);

  useEffect(() => {
    if (autoFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      if (containerRef.current) {
        const focusable = containerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }
    }
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dismissible && status !== 'closing') {
          e.preventDefault();
          e.stopPropagation();
          onDismiss?.();
          close();
        }
      } else if (e.key === 'Tab' && containerRef.current) {
        const focusables = [
          ...containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ),
        ].filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

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
  }, [close, dismissible, onDismiss, status]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (dismissible && e.target === e.currentTarget && status !== 'closing') {
        onDismiss?.();
        close();
      }
    },
    [close, dismissible, onDismiss, status]
  );

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (status === 'closing' && e.target === e.currentTarget) {
      remove();
    }
  }, [status, remove]);

  const isClosing = status === 'closing';
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationDuration = prefersReducedMotion ? '0s' : '0.2s';
  const backdropAnimation = isClosing
    ? `ilokestoModalFadeOut ${animationDuration} ease-out forwards`
    : `ilokestoModalFadeIn ${animationDuration} ease-out forwards`;
  const panelAnimation = isClosing
    ? `ilokestoModalScaleOut ${animationDuration} ease-out forwards`
    : `ilokestoModalScaleIn ${animationDuration} ease-out forwards`;

  return (
    <div
      className={`ilokesto-modal-inline-wrapper ${isClosing ? 'ilokesto-modal-closing' : 'ilokesto-modal-open'}`}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        zIndex: 10000,
        ...getPositionStyles(position),
      }}
    >
      <div
        className={`ilokesto-modal-backdrop ${backdropClassName || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          animation: backdropAnimation,
          ...backdropStyle,
        }}
        onClick={handleBackdropClick}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className={`ilokesto-modal-panel ${className || ''}`}
        style={{
          position: 'relative',
          zIndex: 1,
          animation: panelAnimation,
          ...style,
        }}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </div>
  );
}
