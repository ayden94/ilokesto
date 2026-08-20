---
"@ilokesto/utilinent": patch
---

Reduce code duplication and improve maintainability across the package. Extract a shared `createTagRenderer` factory that eliminates the per-component `forwardRef` + `createElement` boilerplate duplicated in Show, For, Repeat, Mount, and Switch. Extract `useIsomorphicLayoutEffect`, `isPromiseLike`, and `composeRefs` into shared `hooks/` and `utils/` modules, removing cross-component imports. Unify `RegistryCategory` as the single source of truth for plugin categories so `PluginManager` no longer maintains a separate literal list. Remove unused types (`ExtractValues`, `ExtractByKeyValue`, `GetLiteralKeys`, `LiteralKeys`), dead `SwitchTagHelper` type, and a non-functional generic on `For`'s `renderForTag`. No public API changes.