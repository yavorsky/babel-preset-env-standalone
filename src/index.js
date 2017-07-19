const pluginList = require("babel-preset-env/data/plugins.json");
const builtInsList = require("babel-preset-env/data/built-ins.json");
// const electronToChromium = require("babel-preset-env/data/electron-to-chromium");
const MODULE_TRANSFORMATIONS = require("babel-preset-env/lib/module-transformations").default;
// const { validatePluginsOption } = require("babel-preset-env/lib/normalize-options");
const { defaultWebIncludes } = require("babel-preset-env/lib/default-includes");
const normalizeOptions = require("babel-preset-env/lib/normalize-options").default;
const transformPolyfillRequirePlugin = require("./transform-polyfill-require-plugin").default;

import {
  isPluginRequired,
  // validIncludesAndExcludes,
  // getCurrentNodeVersion,
  // electronVersionToChromeVersion,
  // validateLooseOption,
  // validateModulesOption,
  // validatePluginsOption,
  // checkDuplicateIncludeExcludes
} from "babel-preset-env";
import getTargets from "babel-preset-env/lib/targets-parser";

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
};

const _extends = Object.assign || function (target) {
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

export const transformIncludesAndExcludes = (opts) => ({
  all: opts,
  plugins: opts.filter((opt) => !opt.match(/^(es\d+|web)\./)),
  builtIns: opts.filter((opt) => opt.match(/^(es\d+|web)\./))
});


let hasBeenLogged = false;

const getPluginTargets = (plugin, targets, list) => {
  const envList = list[plugin] || {};
  const filteredList = Object.keys(targets)
  .reduce((a, b) => {
    if (!envList[b] || targets[b] < envList[b]) {
      a[b] = targets[b];
    }
    return a;
  }, {});
  return filteredList;
};

const logPlugin = (plugin, targets, list) => {
  const filteredList = getPluginTargets(plugin, targets, list);
  const logStr = `  ${plugin} ${JSON.stringify(filteredList)}`;
  console.log(logStr);
};

const getBuiltInTargets = (targets) => {
  const builtInTargets = _extends({}, targets);
  if (builtInTargets.uglify != null) {
    delete builtInTargets.uglify;
  }
  return builtInTargets;
};

function getPlatformSpecificDefaultFor(targets) {
  const targetNames = Object.keys(targets);
  const isAnyTarget = !targetNames.length;
  const isWebTarget = targetNames.some((name) => name !== "node");

  return (isAnyTarget || isWebTarget) ? defaultWebIncludes : [];
}

const filterItem = (targets, exclusions, list, item) => {
  const isDefault = defaultWebIncludes.indexOf(item) >= 0;
  const notExcluded = exclusions.indexOf(item) === -1;

  if (isDefault) return notExcluded;
  const isRequired = isPluginRequired(targets, list[item]);
  return isRequired && notExcluded;
};

export default function buildPreset(context, opts = {}) {
  const validatedOptions = normalizeOptions(opts);
  const { debug, loose, moduleType, useBuiltIns, spec } = validatedOptions;
  const targets = getTargets(validatedOptions.targets);
  const include = transformIncludesAndExcludes(validatedOptions.include);
  const exclude = transformIncludesAndExcludes(validatedOptions.exclude);
  // const loose = validateLooseOption(opts.loose);
  // const moduleType = validateModulesOption(opts.modules);
  // TODO: remove whitelist in favor of include in next major
  // if (opts.whitelist && (logOnCompile || !hasBeenWarned)) {
  //   hasBeenWarned = true;
  //   console.warn(`The "whitelist" option has been deprecated
  //   in favor of "include" to match the newly added "exclude" option (instead of "blacklist").`);
  // }
  // const include = validateIncludeOption(opts.whitelist || opts.include);
  // const exclude = validateExcludeOption(opts.exclude);
  // checkDuplicateIncludeExcludes(include.all, exclude.all);
  // const targets = getTargets(opts.targets);
  // const debug = opts.debug;
  // const useBuiltIns = opts.useBuiltIns;

  let transformations = Object.keys(pluginList)
    .filter((pluginName) => isPluginRequired(targets, pluginList[pluginName]));

  let polyfills;
  let polyfillTargets;
  if (useBuiltIns) {
    polyfillTargets = getBuiltInTargets(targets);
    const filterBuiltIns = filterItem.bind(null, polyfillTargets, exclude.builtIns, builtInsList);
    polyfills = Object.keys(builtInsList)
      .concat(getPlatformSpecificDefaultFor(polyfillTargets))
      .filter(filterBuiltIns)
      .concat(include.builtIns);
  }

  const logOnCompile = debug === "compile";
  if (debug && (logOnCompile || !hasBeenLogged)) {
    hasBeenLogged = true;
    console.log("babel-preset-env: `DEBUG` option");
    console.log("");
    console.log(`Using targets: ${JSON.stringify(targets, null, 2)}`);
    console.log("");
    console.log(`modules transform: ${moduleType}`);
    console.log("");
    console.log("Using plugins:");
    transformations.forEach((transform) => {
      logPlugin(transform, targets, pluginList);
    });
    console.log("\nUsing polyfills:");
    if (useBuiltIns && polyfills.length) {
      polyfills.forEach((polyfill) => {
        logPlugin(polyfill, targets, builtInsList);
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
    [availablePlugins[`babel-plugin-${pluginName}`], { loose, spec }]
  ));

  useBuiltIns &&
    plugins.push([transformPolyfillRequirePlugin, { polyfills, regenerator }]);

  if (opts.onPresetBuild) {
    const transformationsWithTargets = transformations.map((transform) => (
      {
        name: transform,
        targets: getPluginTargets(transform, targets, pluginList)
      }
    ));
    let polyfillsWithTargets;
    if (useBuiltIns) {
      polyfillsWithTargets = polyfills.map((polyfill) => (
        {
          name: polyfill,
          targets: getPluginTargets(polyfill, targets, builtInsList)
        }
      ));
    }

    opts.onPresetBuild({
      targets,
      transformations,
      transformationsWithTargets,
      polyfills,
      polyfillsWithTargets,
      modulePlugin
    });
  }

  return {
    plugins
  };
}
