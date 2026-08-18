---
'@ilokesto/fetcher': patch
---

Relax `PathsLike` constraint from `Record<string, ...>` to `object` so canonical OpenAPI generators (e.g. `openapi-typescript`) that emit `interface paths { '/users': ... }` satisfy the generic constraint. TypeScript interfaces do not have implicit string index signatures, so the previous `Record<string, ...>` constraint rejected them.