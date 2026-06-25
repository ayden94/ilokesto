/// <reference types="@testing-library/jest-dom" />

import { useState } from 'react';
import type React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ModalProvider } from '../src/components/ModalProvider';
import { useModal } from '../src/hooks/useModal';

function ModalContent({ close }: { close: (result?: boolean) => void }) {
  return (
    <section>
      <button type="button" onClick={() => close(true)}>
        Confirm inside
      </button>
    </section>
  );
}

function Launcher() {
  const { display } = useModal();
  const [result, setResult] = useState('pending');

  const openModal = async () => {
    const confirmed = await display<boolean>({
      id: 'render-confirm',
      ariaLabel: 'Render confirm',
      render: (close) => <ModalContent close={close} />,
    });

    setResult(String(confirmed));
  };

  return (
    <div>
      <button type="button" onClick={openModal}>
        Open modal
      </button>
      <span>Result: {result}</span>
    </div>
  );
}

describe('useModal render callback', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('lets modal content resolve its display promise with scoped close', async () => {
    render(
      <ModalProvider>
        <Launcher />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open modal' }));

    expect(await screen.findByRole('dialog', { name: 'Render confirm' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm inside' }));
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Render confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Result: true')).toBeInTheDocument();
    });
  });

  it('rejects passing render and children at display call time', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    const { result } = renderHook(() => useModal(), { wrapper });

    expect(() =>
      result.current.display({
        ariaLabel: 'Invalid modal',
        children: <button type="button">Child</button>,
        render: () => <button type="button">Render</button>,
      } as unknown as Parameters<typeof result.current.display>[0])
    ).toThrow('Use either render or children for modal content, not both.');
  });

});
