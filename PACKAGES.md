# ilokesto Packages

Each row describes one package's responsibility, comparable libraries, and where it fits in the ecosystem.

## @ilokesto/store

- **Scope**: Atomic, framework-agnostic state container with selector subscriptions.
- **Key idea**: A single store holds state; components subscribe to slices via selectors.
- **Comparable to**: Zustand, Valtio, Jotai, Redux.
- **Differentiator**: Smaller API surface than Redux; explicit selector-driven updates without proxy magic.
- **Used by**: `state`, `overlay`, `form`, `toast` (direct or transitive).

## @ilokesto/state

- **Scope**: Higher-level state primitives built on `store`: plain state, reducer state, middleware, framework bindings.
- **Key idea**: Gives you React/Vue/Solid/Svelte/Angular adapters over `store` primitives.
- **Comparable to**: Redux Toolkit, Zustand with middleware, Pinia, Svelte stores.
- **Differentiator**: Framework adapters share the same core instead of per-framework reimplementations.
- **Depends on**: `@ilokesto/store`.

## @ilokesto/form

- **Scope**: Headless form state management: field registration, validation flow, array fields, submit handling.
- **Key idea**: Form state is a structured `store`; adapters wire it to React/Vue/Solid/Svelte.
- **Comparable to**: React Hook Form, Formik, TanStack Form, Final Form.
- **Differentiator**: Built on top of `store`, so form state can be inspected and composed like any other state.
- **Depends on**: `@ilokesto/store`.

## @ilokesto/overlay

- **Scope**: Provider-scoped React overlay runtime for modals, toasts, and custom layers.
- **Key idea**: A central `OverlayHost` and item store manage layered UI elements.
- **Comparable to**: React Portal patterns, `react-overlays`, Radix Dialog primitives.
- **Differentiator**: Opinionated lifecycle and adapter model for modals/toasts built on top.
- **Depends on**: `@ilokesto/store`.

## @ilokesto/modal

- **Scope**: Pre-built modal system on top of `overlay`.
- **Key idea**: Adapter pattern for inline and top-layer rendering.
- **Comparable to**: Radix Dialog, Headless UI Dialog, React Modal.
- **Differentiator**: Built on `overlay`'s lifecycle model; consistent with toast.
- **Depends on**: `@ilokesto/overlay`.

## @ilokesto/toast

- **Scope**: Toast notification system on top of `overlay`.
- **Key idea**: Toast items are overlay items with motion, position, and auto-dismiss semantics.
- **Comparable to**: React-Toastify, Sonner, react-hot-toast.
- **Differentiator**: Unified overlay runtime with modal; shared provider and adapter model.
- **Depends on**: `@ilokesto/overlay` (direct), `@ilokesto/store` (direct).

## @ilokesto/fetcher

- **Scope**: Type-safe HTTP client facade with OpenAPI awareness.
- **Key idea**: Thin wrapper around `ky` that preserves runtime ergonomics and adds type inference.
- **Comparable to**: ky, ofetch, axios, openapi-fetch, tRPC (client).
- **Differentiator**: Keeps `ky`'s API while adding TypeScript/OpenAPI conveniences.
- **Standalone**: No internal ilokesto dependencies.

## @ilokesto/utilinent

- **Scope**: Utility React components and helpers for conditional rendering and async states.
- **Key idea**: Small, composable components (`Switch`, `Match`, async utilities) that proxy to underlying elements.
- **Comparable to**: Radix utilities, React conditional rendering helpers.
- **Differentiator**: Proxy-based polymorphic components; designed to pair with `overlay`/`modal`/`toast`.
- **Standalone**: No internal ilokesto dependencies.
