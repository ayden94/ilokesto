/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ModalProvider } from '../src/components/ModalProvider';

describe('ModalProvider', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('ilokesto-modal-styles')?.remove();
  });

  it('renders children and injects shared styles once', () => {
    const { rerender } = render(
      <ModalProvider>
        <div>App content</div>
      </ModalProvider>
    );

    expect(screen.getByText('App content')).not.toBeNull();
    expect(document.querySelectorAll('#ilokesto-modal-styles')).toHaveLength(1);

    rerender(
      <ModalProvider>
        <div>Updated content</div>
      </ModalProvider>
    );

    expect(screen.getByText('Updated content')).not.toBeNull();
    expect(document.querySelectorAll('#ilokesto-modal-styles')).toHaveLength(1);
  });
});
