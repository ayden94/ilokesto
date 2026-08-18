---
"@ilokesto/modal": patch
---

Scope `onModalClose` de-duplication to each `ModalProvider`'s lifecycle store so two providers with distinct stores can reuse the same explicit id without suppressing or duplicating each other's close callbacks. Duplicate open requests for an already-pending id no longer reset that item's notification state.