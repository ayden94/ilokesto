import { Draft, produce } from 'immer';

// Constrain to objects so immer drafts only apply to reference types
export function adaptor<T extends object>(fn: (draft: Draft<T>) => void) {
  return produce<T>(fn);
}
