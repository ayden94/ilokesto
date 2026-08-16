/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { ModalAdapterInline } from '../src/adapters/ModalAdapterInline';
import { ModalAdapterTopLayer } from '../src/adapters/ModalAdapterTopLayer';
import { renderWithModalStack } from './modalStackTestUtils';

describe('same-provider modal stack behavior', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('keeps duplicate-ID inline entries distinct through the closing phase', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    const renderStack = (showInner: boolean) => (
      <>
        <ModalAdapterInline
          id="duplicate-id"
          isOpen
          status="open"
          close={outerClose}
          remove={vi.fn()}
          ariaLabel="Outer modal"
          render={() => null}
        />
        {showInner && (
          <ModalAdapterInline
            id="duplicate-id"
            isOpen={false}
            status="closing"
            close={innerClose}
            remove={vi.fn()}
            ariaLabel="Inner modal"
            render={() => null}
          />
        )}
      </>
    );
    const { rerender } = renderWithModalStack(renderStack(true));

    const wrappers = document.querySelectorAll<HTMLElement>('.ilokesto-modal-inline-wrapper');
    expect(wrappers[0]).toHaveStyle({ zIndex: '10000' });
    expect(wrappers[1]).toHaveStyle({ zIndex: '10001' });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(outerClose).not.toHaveBeenCalled();
    expect(innerClose).not.toHaveBeenCalled();

    rerender(renderStack(false));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(outerClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a closing top-layer entry above its same-provider parent until unmount', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    const renderStack = (showInner: boolean) => (
      <>
        <ModalAdapterTopLayer
          id="outer-dialog"
          isOpen
          status="open"
          close={outerClose}
          remove={vi.fn()}
          ariaLabel="Outer dialog"
          render={() => null}
        />
        {showInner && (
          <ModalAdapterTopLayer
            id="inner-dialog"
            isOpen={false}
            status="closing"
            close={innerClose}
            remove={vi.fn()}
            ariaLabel="Inner dialog"
            render={() => null}
          />
        )}
      </>
    );
    const { rerender } = renderWithModalStack(renderStack(true));

    fireEvent(screen.getByRole('dialog', { name: 'Outer dialog' }), new Event('cancel'));
    fireEvent(screen.getByRole('dialog', { name: 'Inner dialog' }), new Event('cancel'));

    expect(outerClose).not.toHaveBeenCalled();
    expect(innerClose).not.toHaveBeenCalled();

    rerender(renderStack(false));
    fireEvent(screen.getByRole('dialog', { name: 'Outer dialog' }), new Event('cancel'));

    expect(outerClose).toHaveBeenCalledTimes(1);
  });

  it('transitions backdrop ownership after the closing top-layer entry unmounts', () => {
    // Given
    const outerClose = vi.fn();
    const outerDismiss = vi.fn();
    const innerClose = vi.fn();
    const innerDismiss = vi.fn();
    const renderStack = (showInner: boolean) => (
      <>
        <ModalAdapterTopLayer
          id="outer-dialog"
          isOpen
          status="open"
          close={outerClose}
          remove={vi.fn()}
          onDismiss={outerDismiss}
          ariaLabel="Outer bounded dialog"
          render={() => null}
        />
        {showInner && (
          <ModalAdapterTopLayer
            id="inner-dialog"
            isOpen={false}
            status="closing"
            close={innerClose}
            remove={vi.fn()}
            onDismiss={innerDismiss}
            ariaLabel="Inner closing dialog"
            render={() => null}
          />
        )}
      </>
    );
    const { rerender } = renderWithModalStack(renderStack(true));
    const outerDialog = screen.getByRole('dialog', { name: 'Outer bounded dialog' });
    const innerDialog = screen.getByRole('dialog', { name: 'Inner closing dialog' });
    vi.spyOn(outerDialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200));
    vi.spyOn(innerDialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 220, 160, 160));

    // When
    fireEvent.click(outerDialog, { clientX: 99, clientY: 300 });
    fireEvent.click(innerDialog, { clientX: 119, clientY: 300 });

    // Then
    expect(outerDismiss).not.toHaveBeenCalled();
    expect(outerClose).not.toHaveBeenCalled();
    expect(innerDismiss).not.toHaveBeenCalled();
    expect(innerClose).not.toHaveBeenCalled();

    // When
    rerender(renderStack(false));
    fireEvent.click(outerDialog, { clientX: 200, clientY: 300 });

    // Then
    expect(outerDismiss).not.toHaveBeenCalled();
    expect(outerClose).not.toHaveBeenCalled();

    // When
    fireEvent.click(outerDialog, { clientX: 99, clientY: 300 });

    // Then
    expect(outerDismiss).toHaveBeenCalledTimes(1);
    expect(outerClose).toHaveBeenCalledTimes(1);
  });
});
