/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { ModalAdapterTopLayer } from '../src/adapters/ModalAdapterTopLayer';
import { renderWithModalStack } from './modalStackTestUtils';

describe('ModalAdapterTopLayer', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a named native dialog and moves focus inside after showModal', () => {
    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={vi.fn()}
        remove={vi.fn()}
        ariaLabel="Settings"
        render={() => <button type="button">Save</button>}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('closes on native cancel when dismissible', () => {
    const close = vi.fn();

    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={close}
        remove={vi.fn()}
        ariaLabel="Cancellable dialog"
        render={() => null}
      />
    );

    fireEvent(screen.getByRole('dialog', { name: 'Cancellable dialog' }), new Event('cancel'));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['interior', 200, 300],
    ['left edge', 100, 300],
    ['right edge', 300, 300],
    ['top edge', 200, 200],
    ['bottom edge', 200, 400],
  ])('keeps a click on the dialog %s open', (_location, clientX, clientY) => {
    // Given
    const close = vi.fn();
    const onDismiss = vi.fn();
    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={close}
        remove={vi.fn()}
        onDismiss={onDismiss}
        ariaLabel="Bounded dialog"
        render={() => null}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Bounded dialog' });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200));

    // When
    fireEvent.click(dialog, { clientX, clientY });

    // Then
    expect(onDismiss).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it.each([
    ['left', 99, 300],
    ['right', 301, 300],
    ['above', 200, 199],
    ['below', 200, 401],
  ])('dismisses once for a click strictly %s the dialog border box', (_direction, clientX, clientY) => {
    // Given
    const close = vi.fn();
    const onDismiss = vi.fn();
    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={close}
        remove={vi.fn()}
        onDismiss={onDismiss}
        ariaLabel="Backdrop dialog"
        render={() => null}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Backdrop dialog' });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200));

    // When
    fireEvent.click(dialog, { clientX, clientY });

    // Then
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores a descendant target even when its click coordinates are outside', () => {
    // Given
    const close = vi.fn();
    const onDismiss = vi.fn();
    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={close}
        remove={vi.fn()}
        onDismiss={onDismiss}
        ariaLabel="Descendant dialog"
        render={() => <button type="button">Keep open</button>}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Descendant dialog' });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200));

    // When
    fireEvent.click(screen.getByRole('button', { name: 'Keep open' }), {
      clientX: 99,
      clientY: 300,
    });

    // Then
    expect(onDismiss).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it.each([
    ['non-dismissible', false, 'open' as const],
    ['closing', true, 'closing' as const],
  ])('ignores an outside click when the dialog is %s', (_condition, dismissible, status) => {
    // Given
    const close = vi.fn();
    const onDismiss = vi.fn();
    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen={status === 'open'}
        status={status}
        close={close}
        remove={vi.fn()}
        dismissible={dismissible}
        onDismiss={onDismiss}
        ariaLabel="Guarded dialog"
        render={() => null}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Guarded dialog' });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200));

    // When
    fireEvent.click(dialog, { clientX: 99, clientY: 300 });

    // Then
    expect(onDismiss).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('passes scoped close to render content', () => {
    const close = vi.fn();

    renderWithModalStack(
      <ModalAdapterTopLayer
        id="modal-id"
        isOpen
        status="open"
        close={close}
        remove={vi.fn()}
        ariaLabel="Render dialog"
        render={(scopedClose) => (
          <button type="button" onClick={() => scopedClose('saved')}>
            Save scoped
          </button>
        )}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save scoped' }));

    expect(close).toHaveBeenCalledWith('saved');
  });
});
