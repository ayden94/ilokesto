import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ModalProvider, useModal } from '../../../src';

function InlineConfirmButton() {
  const { display } = useModal();
  const [result, setResult] = useState('pending');

  const open = async () => {
    const confirmed = await display<boolean>({
      id: 'inline-confirm',
      ariaLabelledBy: 'inline-confirm-title',
      ariaDescribedBy: 'inline-confirm-description',
      render: (close) => (
        <section style={{ background: 'white', padding: 24 }}>
          <h2 id="inline-confirm-title">Delete item?</h2>
          <p id="inline-confirm-description">This action cannot be undone.</p>
          <button type="button" onClick={() => close(false)}>Cancel</button>
          <button type="button" onClick={() => close(true)}>Delete</button>
        </section>
      ),
    });

    setResult(String(confirmed));
  };

  return (
    <section aria-label="Inline modal demo">
      <button type="button" onClick={open}>Open inline confirm</button>
      <p>Inline result: {result}</p>
    </section>
  );
}

function TopLayerButton() {
  const { display } = useModal();
  const [result, setResult] = useState('pending');

  const open = async () => {
    const saved = await display<boolean>({
      id: 'top-layer-settings',
      transport: 'top-layer',
      ariaLabel: 'Settings dialog',
      render: (close) => (
        <section>
          <h2>Settings</h2>
          <button type="button" onClick={() => close(true)}>Save settings</button>
        </section>
      ),
    });

    setResult(String(saved));
  };

  return (
    <section aria-label="Top layer modal demo">
      <button type="button" onClick={open}>Open top-layer settings</button>
      <p>Top-layer result: {result}</p>
    </section>
  );
}

function StackedOuterContent({ closeOuter }: { closeOuter: (result?: string) => void }) {
  const { display } = useModal();

  const openInner = () => {
    void display<string>({
      id: 'inner-modal',
      ariaLabel: 'Inner modal',
      render: (closeInner) => (
        <section style={{ background: 'white', padding: 24 }}>
          <h2>Inner modal</h2>
          <button type="button" onClick={() => closeInner('inner closed')}>Close inner</button>
        </section>
      ),
    });
  };

  return (
    <section style={{ background: 'white', padding: 24 }}>
      <h2>Outer modal</h2>
      <button type="button" onClick={openInner}>Open inner modal</button>
      <button type="button" onClick={() => closeOuter('outer closed')}>Close outer</button>
    </section>
  );
}

function StackedButton() {
  const { display } = useModal();
  const [result, setResult] = useState('pending');

  const open = async () => {
    const outerResult = await display<string>({
      id: 'outer-modal',
      ariaLabel: 'Outer modal',
      render: (closeOuter) => <StackedOuterContent closeOuter={closeOuter} />,
    });

    setResult(String(outerResult));
  };

  return (
    <section aria-label="Stacked modal demo">
      <button type="button" onClick={open}>Open stacked modals</button>
      <p>Stacked result: {result}</p>
    </section>
  );
}

function DemoApp() {
  return (
    <ModalProvider>
      <main>
        <h1>Modal E2E Fixture</h1>
        <InlineConfirmButton />
        <TopLayerButton />
        <StackedButton />
      </main>
    </ModalProvider>
  );
}

createRoot(document.getElementById('root')!).render(<DemoApp />);
