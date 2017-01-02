import pluginList from "babel-preset-env/data/plugins.json";
import builtInsList from "babel-preset-env/data/built-ins.json";
import electronToChromium from "babel-preset-env/data/electron-to-chromium";
import transformPolyfillRequirePlugin from "./transform-polyfill-require-plugin";
import {
  MODULE_TRANSFORMATIONS,
  isPluginRequired, 
  validIncludesAndExcludes, 
  getCurrentNodeVersion, 
  electronVersionToChromeVersion, 
  getTargets, 
  validateLooseOption,
  validateModulesOption, 
  validatePluginsOption,
  checkDuplicateIncludeExcludes} from "babel-preset-env";

export const availablePlugins = {
  "babel-plugin-check-es2015-constants": require("babel-plugin-check-es2015-constants"),
  "babel-plugin-syntax-trailing-function-commas": require("babel-plugin-syntax-trailing-function-commas"),
  "babel-plugin-transform-async-to-generator": require("babel-plugin-transform-async-to-generator"),
  "babel-plugin-transform-es2015-arrow-functions": require("babel-plugin-transform-es2015-arrow-functions"),
  "babel-plugin-transform-es2015-block-scoped-functions": require("babel-plugin-transform-es2015-block-scoped-functions"),
  "babel-plugin-transform-es2015-block-scoping": require("babel-plugin-transform-es2015-block-scoping"),
  "babel-plugin-transform-es2015-classes": require("babel-plugin-transform-es2015-classes"),
  "babel-plugin-transform-es2015-computed-properties": require("babel-plugin-transform-es2015-computed-properties"),
  "babel-plugin-transform-es2015-destructuring": require("babel-plugin-transform-es2015-destructuring"),
  "babel-plugin-transform-es2015-duplicate-keys": require("babel-plugin-transform-es2015-duplicate-keys"),
  "babel-plugin-transform-es2015-for-of": require("babel-plugin-transform-es2015-for-of"),
  "babel-plugin-transform-es2015-function-name": require("babel-plugin-transform-es2015-function-name"),
  "babel-plugin-transform-es2015-literals": require("babel-plugin-transform-es2015-literals"),
  "babel-plugin-transform-es2015-modules-amd": require("babel-plugin-transform-es2015-modules-amd"),
  "babel-plugin-transform-es2015-modules-commonjs": require("babel-plugin-transform-es2015-modules-commonjs"),
  "babel-plugin-transform-es2015-modules-systemjs": require("babel-plugin-transform-es2015-modules-systemjs"),
  "babel-plugin-transform-es2015-modules-umd": require("babel-plugin-transform-es2015-modules-umd"),
  "babel-plugin-transform-es2015-object-super": require("babel-plugin-transform-es2015-object-super"),
  "babel-plugin-transform-es2015-parameters": require("babel-plugin-transform-es2015-parameters"),
  "babel-plugin-transform-es2015-shorthand-properties": require("babel-plugin-transform-es2015-shorthand-properties"),
  "babel-plugin-transform-es2015-spread": require("babel-plugin-transform-es2015-spread"),
  "babel-plugin-transform-es2015-sticky-regex": require("babel-plugin-transform-es2015-sticky-regex"),
  "babel-plugin-transform-es2015-template-literals": require("babel-plugin-transform-es2015-template-literals"),
  "babel-plugin-transform-es2015-typeof-symbol": require("babel-plugin-transform-es2015-typeof-symbol"),
  "babel-plugin-transform-es2015-unicode-regex": require("babel-plugin-transform-es2015-unicode-regex"),
  "babel-plugin-transform-exponentiation-operator": require("babel-plugin-transform-exponentiation-operator"),
  "babel-plugin-transform-regenerator": require("babel-plugin-transform-regenerator")
}

const defaultInclude = [
  "web.timers",
  "web.immediate",
  "web.dom.iterable"
];

const validateIncludeOption = (opts) => validatePluginsOption(opts, "include");
const validateExcludeOption = (opts) => validatePluginsOption(opts, "exclude");

let hasBeenLogged = false;
let hasBeenWarned = false;

const logPlugin = (plugin, targets, list) => {
  const envList = list[plugin] || {};
  const filteredList = Object.keys(targets)
  .reduce((a, b) => {
    a[b] = envList[b];
    return a;
  }, {});
  const logStr = `\n ${plugin} ${JSON.stringify(filteredList)}`;
  console.log(logStr);
};

export default function buildPreset(context, opts = {}) {
  const loose = validateLooseOption(opts.loose);
  const moduleType = validateModulesOption(opts.modules);
  // TODO: remove whitelist in favor of include in next major
  if (opts.whitelist && !hasBeenWarned) {
    hasBeenWarned = true;
    console.warn(`The "whitelist" option has been deprecated
    in favor of "include" to match the newly added "exclude" option (instead of "blacklist").`);
  }
  const include = validateIncludeOption(opts.whitelist || opts.include);
  const exclude = validateExcludeOption(opts.exclude);
  checkDuplicateIncludeExcludes(include.all, exclude.all);
  const targets = getTargets(opts.targets);
  const debug = opts.debug;
  const useBuiltIns = opts.useBuiltIns;

  let transformations = Object.keys(pluginList)
    .filter((pluginName) => isPluginRequired(targets, pluginList[pluginName]));

  let polyfills;
  if (useBuiltIns) {
    polyfills = Object.keys(builtInsList)
      .filter((builtInName) => isPluginRequired(targets, builtInsList[builtInName]))
      .concat(defaultInclude)
      .filter((plugin) => exclude.builtIns.indexOf(plugin) === -1)
      .concat(include.builtIns);
  }

  if (debug && !hasBeenLogged) {
    hasBeenLogged = true;
    console.log("babel-preset-env: `DEBUG` option");
    console.log("");
    console.log(`Using targets: ${JSON.stringify(opts.targets, null, 2)}`);
    console.log("");
    console.log(`modules transform: ${moduleType}`);
    console.log("");
    console.log("Using plugins:");
    transformations.forEach((transform) => {
      logPlugin(transform, opts.targets, pluginList);
    });
    console.log("\nUsing polyfills:");
    if (useBuiltIns && polyfills.length) {
      polyfills.forEach((polyfill) => {
        logPlugin(polyfill, opts.targets, builtInsList);
      });
    }
  }

  const allTransformations = transformations
    .filter((plugin) => exclude.plugins.indexOf(plugin) === -1)
    .concat(include.plugins);

  const regenerator = allTransformations.indexOf("transform-regenerator") >= 0;
  const modulePlugin = moduleType !== false && MODULE_TRANSFORMATIONS[moduleType];
  const plugins = [];

  modulePlugin &&
    plugins.push([availablePlugins[`babel-plugin-${modulePlugin}`], { loose }]);

  plugins.push(...allTransformations.map((pluginName) =>
    [availablePlugins[`babel-plugin-${pluginName}`], { loose }]
  ));

  useBuiltIns &&
    plugins.push([transformPolyfillRequirePlugin, { polyfills, regenerator }]);

  return {
    plugins
  };
}

