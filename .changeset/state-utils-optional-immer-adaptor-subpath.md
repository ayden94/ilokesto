---
"@ilokesto/state": major
---

### Breaking change: `adaptor` moved from `@ilokesto/state/utils` to `@ilokesto/state/adaptor`

`@ilokesto/state/utils` eagerly re-exported `adaptor`, which statically imports `immer`. Because ESM module graphs evaluate eagerly, importing anything from `@ilokesto/state/utils` failed with `ERR_MODULE_NOT_FOUND` for consumers that had not installed the optional `immer` peer. Keeping `adaptor` on `utils` without eager `immer` resolution is impossible in plain ESM without making `adaptor` asynchronous, so `adaptor` now lives on its own subpath.

#### What changed

- `@ilokesto/state/utils` no longer exports `adaptor`; it exports only `pipe`, `definePipeableMiddleware`, and pipe types, none of which touch `immer`.
- New public subpath `@ilokesto/state/adaptor` exports `adaptor` and is the only entry point that resolves `immer`.
- Added a packed-consumer regression test (`test/utils-import-without-immer.test.ts`) that installs the tarball without `immer` and proves `utils` imports cleanly while `adaptor` fails on `immer` only.

#### Migration

```ts
// Before
import { adaptor } from '@ilokesto/state/utils';

// After
import { adaptor } from '@ilokesto/state/adaptor';
```

`immer` remains an optional peer dependency: install it only when you use `@ilokesto/state/adaptor`. Consumers of `@ilokesto/state/utils` who never used `adaptor` need no changes; their imports now work without `immer` installed.
