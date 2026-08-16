---
"@ilokesto/modal": patch
---

Scope modal stack policy to each ModalProvider so providers with distinct stores no longer interfere with inline or top-layer ordering, dismissal, and focus behavior. Fixes #10.
