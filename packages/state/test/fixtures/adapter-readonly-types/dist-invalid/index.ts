import { create as createAngular } from '@ilokesto/state/angular';
import { create as createReact } from '@ilokesto/state/react';
import { create as createSolid } from '@ilokesto/state/solid';
import { create as createSvelte } from '@ilokesto/state/svelte';
import { create as createVue } from '@ilokesto/state/vue';

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
