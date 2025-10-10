import { builtinEnvironments } from 'vitest/environments';

const base = builtinEnvironments.jsdom;

export const name = base.name;
export const transformMode = base.transformMode;
export const setupVM = base.setupVM;
export const setup = base.setup;

export const createVitestEnvironment = (context) => base.setup(context);

export default {
  ...base,
  createVitestEnvironment,
};
