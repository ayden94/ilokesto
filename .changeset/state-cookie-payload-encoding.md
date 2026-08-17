---
"@ilokesto/state": patch
---

Encode cookie persistence payloads so JSON values containing equals signs and cookie delimiters rehydrate without truncation, while continuing to read legacy raw payloads.
