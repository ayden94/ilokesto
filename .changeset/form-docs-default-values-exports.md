---
"@ilokesto/form": patch
---

Align form documentation with the actual public contract: use `defaultValues` (not the non-existent `initialValues`) in all examples and prose, and document only the types the root entrypoint actually exports. `FieldState` and `FormState` are now described as runtime shapes returned by `getFieldState()` and `getState()`, not as root imports.