---
"@ilokesto/state": patch
---

Reject invalid `debounce()` wait values before Store or timer setup. Delays must now be finite non-negative milliseconds; `0` remains valid.
