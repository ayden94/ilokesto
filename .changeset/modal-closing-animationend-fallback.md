---
"@ilokesto/modal": patch
---

Guarantee modal removal with a closing fallback that fires when no `animationend` event occurs (for example when a consumer sets `style={{ animation: 'none' }}`), while retaining `animationend` as the normal fast path. The fallback reads the effective animation duration and is canceled when the fast path completes.