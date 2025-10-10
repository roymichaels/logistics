const { builtinEnvironments } = require('vitest/environments');

const base = builtinEnvironments.jsdom;

const createVitestEnvironment = (context) => base.setup(context);

module.exports = {
  ...base,
  name: base.name,
  transformMode: base.transformMode,
  setupVM: base.setupVM,
  setup: base.setup,
  createVitestEnvironment,
};

module.exports.createVitestEnvironment = createVitestEnvironment;
module.exports.name = base.name;
module.exports.transformMode = base.transformMode;
module.exports.setupVM = base.setupVM;
module.exports.setup = base.setup;
