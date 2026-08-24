import { create as createAngular } from '../../../../src/core/Angular/index.js';
import { create as createReact } from '../../../../src/core/React/index.js';
import { create as createSolid } from '../../../../src/core/Solid/index.js';
import { create as createSvelte } from '../../../../src/core/Svelte/index.js';
import { create as createVue } from '../../../../src/core/Vue/index.js';

type State = {
  angularReadResultMutation: number;
  angularSelectorMutation: number;
  reactReadResultMutation: number;
  reactSelectorMutation: number;
  solidReadResultMutation: number;
  solidSelectorMutation: number;
  svelteReadResultMutation: number;
  svelteSelectorMutation: number;
  vueReadResultMutation: number;
  vueSelectorMutation: number;
};

const initialState: State = {
  angularReadResultMutation: 0,
  angularSelectorMutation: 0,
  reactReadResultMutation: 0,
  reactSelectorMutation: 0,
  solidReadResultMutation: 0,
  solidSelectorMutation: 0,
  svelteReadResultMutation: 0,
  svelteSelectorMutation: 0,
  vueReadResultMutation: 0,
  vueSelectorMutation: 0,
};

const angular = createAngular<State>(initialState);
angular((state) => {
  state.angularSelectorMutation = 1;
  return state.angularSelectorMutation;
});
angular.readOnly().angularReadResultMutation = 1;

const react = createReact<State>(initialState);
react((state) => {
  state.reactSelectorMutation = 1;
  return state.reactSelectorMutation;
});
react.readOnly().reactReadResultMutation = 1;

const solid = createSolid<State>(initialState);
solid((state) => {
  state.solidSelectorMutation = 1;
  return state.solidSelectorMutation;
});
solid.readOnly().solidReadResultMutation = 1;

const svelte = createSvelte<State>(initialState);
svelte.select((state) => {
  state.svelteSelectorMutation = 1;
  return state.svelteSelectorMutation;
});
svelte.readOnly().svelteReadResultMutation = 1;

const vue = createVue<State>(initialState);
vue((state) => {
  state.vueSelectorMutation = 1;
  return state.vueSelectorMutation;
});
vue.readOnly().vueReadResultMutation = 1;
