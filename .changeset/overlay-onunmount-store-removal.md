---
"@ilokesto/overlay": patch
---

Tie `onUnmount` lifecycle hooks to overlay store removal so provider teardown does not end a still-pending item lifecycle.
