/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { ModalAdapterInline } from '../src/adapters/ModalAdapterInline';
import { ModalAdapterTopLayer } from '../src/adapters/ModalAdapterTopLayer';
import { renderWithModalStack } from './modalStackTestUtils';

describe('modal closing fallback', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    vi.useRealTimers();
  });

  it('removes an inline modal even when the consumer disables the exit animation', () => {
    vi.useFakeTimers();
    const remove = vi.fn();

    renderWithModalStack(
      <ModalAdapterInline
        id="no-animation"
        isOpen={false}
        status="closing"
        close={vi.fn()}
        remove={remove}
        useLifecycle={vi.fn()}
        style={{ animation: 'none' }}
        ariaLabel="No animation inline"
        render={() => null}
      />
    );

    expect(remove).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('keeps animationend as the inline fast path and cancels the fallback', () => {
    vi.useFakeTimers();
    const remove = vi.fn();

    const { unmount } = renderWithModalStack(
      <ModalAdapterInline
        id="animated"
        isOpen={false}
        status="closing"
        close={vi.fn()}
        remove={remove}
        useLifecycle={vi.fn()}
        ariaLabel="Animated inline"
        render={() => null}
      />
    );

    act(() => {
      fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Animated inline' }));
    });

    expect(remove).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('removes a top-layer dialog even when the consumer disables the exit animation', () => {
    vi.useFakeTimers();
    const remove = vi.fn();

    renderWithModalStack(
      <ModalAdapterTopLayer
        id="no-animation-dialog"
        isOpen={false}
        status="closing"
        close={vi.fn()}
        remove={remove}
        useLifecycle={vi.fn()}
        style={{ animation: 'none' }}
        ariaLabel="No animation top-layer"
        render={() => null}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'No animation top-layer' }) as HTMLDialogElement;
    const closeSpy = vi.spyOn(dialog, 'close');

    expect(remove).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('keeps animationend as the top-layer fast path and cancels the fallback', () => {
    vi.useFakeTimers();
    const remove = vi.fn();

    const { unmount } = renderWithModalStack(
      <ModalAdapterTopLayer
        id="animated-dialog"
        isOpen={false}
        status="closing"
        close={vi.fn()}
        remove={remove}
        useLifecycle={vi.fn()}
        ariaLabel="Animated top-layer"
        render={() => null}
      />
    );

    act(() => {
      fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Animated top-layer' }));
    });

    expect(remove).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});