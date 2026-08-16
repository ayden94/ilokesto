/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ModalAdapterProps } from '../src/shared/types';
import { ModalAdapterInline } from '../src/adapters/ModalAdapterInline';
import { renderWithModalStack } from './modalStackTestUtils';

function renderInline(props: Partial<ModalAdapterProps<unknown>> = {}) {
  const close = vi.fn();
  const remove = vi.fn();

  renderWithModalStack(
    <ModalAdapterInline
      id="modal-id"
      isOpen
      status="open"
      close={close}
      remove={remove}
      render={() => null}
      {...props}
    />
  );

  return { close, remove };
}

describe('ModalAdapterInline', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  it('renders a named modal dialog with description wiring', () => {
    renderInline({
      ariaLabelledBy: 'modal-title',
      ariaDescribedBy: 'modal-description',
      render: () => (
        <div>
          <h2 id="modal-title">Delete item</h2>
          <p id="modal-description">This cannot be undone.</p>
          <button type="button">Cancel</button>
        </div>
      ),
    });

    const dialog = screen.getByRole('dialog', { name: 'Delete item' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('focuses the first focusable child and restores previous focus on unmount', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open modal';
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = renderWithModalStack(
      <ModalAdapterInline
        id="modal-id"
        isOpen
        status="open"
        close={vi.fn()}
        remove={vi.fn()}
        render={() => <button type="button">Confirm</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('closes on Escape and backdrop click when dismissible', () => {
    const { close } = renderInline({
      ariaLabel: 'Dismissible dialog',
      render: () => <button type="button">Inside</button>,
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss modal' }));

    expect(close).toHaveBeenCalledTimes(2);
  });

  it('does not close from inside clicks', () => {
    const { close } = renderInline({
      ariaLabel: 'Stable dialog',
      render: () => <button type="button">Inside</button>,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inside' }));

    expect(close).not.toHaveBeenCalled();
  });

  it('wraps keyboard focus inside the dialog', () => {
    renderInline({
      ariaLabel: 'Focus trap dialog',
      render: () => (
        <div>
          <button type="button">First</button>
          <button type="button">Last</button>
        </div>
      ),
    });

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
  });

  it('passes scoped close and modal context to render content', () => {
    const { close } = renderInline({
      ariaLabel: 'Render dialog',
      render: (scopedClose, context) => (
        <button type="button" onClick={() => scopedClose('done')}>
          Close {context.id}
        </button>
      ),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close modal-id' }));

    expect(close).toHaveBeenCalledWith('done');
  });

  it('only lets the top inline modal handle Escape', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();

    renderWithModalStack(
      <>
        <ModalAdapterInline
          id="outer-modal"
          isOpen
          status="open"
          close={outerClose}
          remove={vi.fn()}
          ariaLabel="Outer modal"
          render={() => <button type="button">Outer action</button>}
        />
        <ModalAdapterInline
          id="inner-modal"
          isOpen
          status="open"
          close={innerClose}
          remove={vi.fn()}
          ariaLabel="Inner modal"
          render={() => <button type="button">Inner action</button>}
        />
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(outerClose).not.toHaveBeenCalled();
    expect(innerClose).toHaveBeenCalledTimes(1);
  });

  it('stacks nested inline modals above earlier inline modals', () => {
    renderWithModalStack(
      <>
        <ModalAdapterInline
          id="outer-modal"
          isOpen
          status="open"
          close={vi.fn()}
          remove={vi.fn()}
          ariaLabel="Outer modal"
          render={() => null}
        />
        <ModalAdapterInline
          id="inner-modal"
          isOpen
          status="open"
          close={vi.fn()}
          remove={vi.fn()}
          ariaLabel="Inner modal"
          render={() => null}
        />
      </>
    );

    const wrappers = document.querySelectorAll<HTMLElement>('.ilokesto-modal-inline-wrapper');

    expect(wrappers[0]).toHaveStyle({ zIndex: '10000' });
    expect(wrappers[1]).toHaveStyle({ zIndex: '10001' });
  });

  it('uses the reduced-motion preference before first paint', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));

    renderInline({
      ariaLabel: 'Reduced motion dialog',
      render: () => <button type="button">Inside</button>,
    });

    expect(screen.getByRole('dialog', { name: 'Reduced motion dialog' })).toHaveStyle({
      animation: 'ilokestoModalScaleIn 0s ease-out forwards',
    });
  });
});
