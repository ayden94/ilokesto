import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createOverlayStore } from '@ilokesto/overlay';
import { ModalProvider, useModal } from '../../../src';

const firstProviderStore = createOverlayStore();
const secondProviderStore = createOverlayStore();

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
  const [dismissCount, setDismissCount] = useState(0);

  const open = async () => {
    const saved = await display<boolean>({
      id: 'top-layer-settings',
      transport: 'top-layer',
      ariaLabelledBy: 'top-layer-settings-title',
      ariaDescribedBy: 'top-layer-settings-description',
      onDismiss: () => setDismissCount((count) => count + 1),
      style: {
        boxSizing: 'border-box',
        width: 320,
        height: 240,
        padding: 48,
      },
      render: (close) => (
        <section aria-label="Settings content">
          <h2 id="top-layer-settings-title">Settings dialog</h2>
          <p id="top-layer-settings-description">Configure your modal preferences.</p>
          <button type="button">Keep settings open</button>
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
      <p>Top-layer dismiss count: {dismissCount}</p>
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

interface ProviderControlsProps {
  readonly name: 'First' | 'Second';
}

function ProviderControls({ name }: ProviderControlsProps) {
  const { display } = useModal();

  const openInline = () => {
    void display({
      id: `${name.toLowerCase()}-provider-inline`,
      ariaLabel: `${name} provider inline modal`,
      render: (close) => (
        <section>
          <h2>{name} provider inline</h2>
          <button type="button">{name} start</button>
          <button type="button" onClick={() => close()}>{name} close inline</button>
          <button type="button">{name} end</button>
        </section>
      ),
    });
  };

  const openTopLayer = () => {
    void display({
      id: `${name.toLowerCase()}-provider-top-layer`,
      transport: 'top-layer',
      ariaLabel: `${name} provider top-layer modal`,
      render: (close) => (
        <section>
          <h2>{name} provider top layer</h2>
          <button type="button" onClick={() => close()}>{name} close top layer</button>
        </section>
      ),
    });
  };

  return (
    <section aria-label={`${name} provider controls`}>
      <button type="button" onClick={openInline}>Open {name.toLowerCase()} provider inline</button>
      <button type="button" onClick={openTopLayer}>Open {name.toLowerCase()} provider top layer</button>
    </section>
  );
}

function ProviderIsolationDemo() {
  return (
    <section aria-label="Provider isolation demo">
      <ModalProvider store={firstProviderStore}>
        <ProviderControls name="First" />
      </ModalProvider>
      <ModalProvider store={secondProviderStore}>
        <ProviderControls name="Second" />
      </ModalProvider>
    </section>
  );
}

function DemoApp() {
  return (
    <main>
      <ModalProvider>
        <h1>Modal E2E Fixture</h1>
        <InlineConfirmButton />
        <TopLayerButton />
        <StackedButton />
      </ModalProvider>
      <ProviderIsolationDemo />
    </main>
  );
}

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new TypeError('Modal E2E fixture root is missing.');
}

createRoot(rootElement).render(<DemoApp />);
