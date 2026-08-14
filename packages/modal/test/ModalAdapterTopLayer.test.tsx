/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalAdapterTopLayer } from '../src/adapters/ModalAdapterTopLayer';

describe('ModalAdapterTopLayer', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a named native dialog and moves focus inside after showModal', () => {
    render(
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

    render(
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

  it('passes scoped close to render content', () => {
    const close = vi.fn();

    render(
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
