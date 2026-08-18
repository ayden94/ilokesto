import { createOverlayStore } from '@ilokesto/overlay';
import { describe, expect, it, vi } from 'vitest';
import { createModalLifecycleStore } from '../src/shared/lifecycle';

describe('createModalLifecycleStore onModalClose deduplication', () => {
  it('scopes notification state per store so distinct providers fire callbacks independently', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const firstStore = createModalLifecycleStore(createOverlayStore());
    const secondStore = createModalLifecycleStore(createOverlayStore());

    firstStore.open({ id: 'confirm', type: 'modal', props: { onModalClose: firstClose } });
    secondStore.open({ id: 'confirm', type: 'modal', props: { onModalClose: secondClose } });

    firstStore.close('confirm', 'first-result');
    secondStore.remove('confirm');
    firstStore.remove('confirm');

    expect(firstClose).toHaveBeenCalledTimes(1);
    expect(firstClose).toHaveBeenCalledWith('first-result');
    expect(secondClose).toHaveBeenCalledTimes(1);
  });

  it('does not reset notification state for a duplicate open of an already-pending id', () => {
    const onClose = vi.fn();
    const store = createModalLifecycleStore(createOverlayStore());

    store.open({ id: 'confirm', type: 'modal', props: { onModalClose: onClose } });
    store.open({ id: 'confirm', type: 'modal', props: { onModalClose: onClose } });
    store.close('confirm');
    store.remove('confirm');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('notifies again after an item is removed and reopened with the same id', () => {
    const onClose = vi.fn();
    const store = createModalLifecycleStore(createOverlayStore());

    store.open({ id: 'confirm', type: 'modal', props: { onModalClose: onClose } });
    store.close('confirm');
    store.remove('confirm');
    store.open({ id: 'confirm', type: 'modal', props: { onModalClose: onClose } });
    store.close('confirm');

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('notifies each item once when clear closes multiple modals', () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const store = createModalLifecycleStore(createOverlayStore());

    store.open({ id: 'a', type: 'modal', props: { onModalClose: onCloseA } });
    store.open({ id: 'b', type: 'modal', props: { onModalClose: onCloseB } });
    store.clear();

    expect(onCloseA).toHaveBeenCalledTimes(1);
    expect(onCloseB).toHaveBeenCalledTimes(1);
  });
});