/* jshint esversion: 8, node: true */
// @ts-check

const {
  findMetroPath,
  requireModuleFromMetro,
} = require("@rnx-kit/tools-react-native/metro");
const fs = require("fs");
const path = require("path");

/**
 * @typedef {import("metro-config").MetroConfig} MetroConfig;
 */

/** Packages that must be resolved to one specific copy. */
const UNIQUE_PACKAGES = ["react", "react-native"];

/**
 * A minimum list of folders that should be watched by Metro.
 * @returns {string[]}
 */
function defaultWatchFolders() {
  const {
    findWorkspacePackagesSync,
    findWorkspaceRootSync,
  } = require("@rnx-kit/tools-workspaces");

  try {
    const root = findWorkspaceRootSync();
    if (!root) {
      return [];
    }

    const packages = findWorkspacePackagesSync();
    if (!Array.isArray(packages) || packages.length === 0) {
      return [];
    }

    // In a monorepo, in particular when using Yarn workspaces, packages are
    // symlinked in the root `node_modules` folder so it needs to be watched.
    const rootNodeModules = path.join(root, "node_modules");
    if (fs.existsSync(rootNodeModules)) {
      packages.unshift(rootNodeModules);
    }

    // Rush + pnpm downloads dependencies into a separate folder.
    const rushPnpmDir = path.join(
      root,
      "common",
      "temp",
      "node_modules",
      ".pnpm"
    );
    if (fs.existsSync(rushPnpmDir)) {
      packages.unshift(rushPnpmDir);
    }

    return packages;
  } catch (_) {
    return [];
  }
}

/**
 * Returns the path to specified module; `undefined` if not found.
 *
 * Note that this function resolves symlinks. This is necessary for setups that
 * only have symlinks under `node_modules` (e.g. with pnpm).
 *
 * @param {string} name
 * @param {string=} startDir
 * @returns {string | undefined}
 */
function resolveModule(name, startDir) {
  const { findPackageDependencyDir } = require("@rnx-kit/tools-node/package");
  return findPackageDependencyDir(name, {
    startDir,
    resolveSymlinks: true,
  });
}

/**
 * Returns the path to specified package, and a regex to exclude extra copies of
 * it.
 *
 * The regex pattern should be added to the blocklist, while the path should be
 * added to `extraNodeModules` so Metro can resolve the correct copy regardless
 * of where it might be installed. You should also restart Watchman and reset
 * Metro cache if you're adding/removing excludes.
 *
 * @see exclusionList for further information.
 *
 * @param {string} packageName Name of the package to exclude extra copies of
 * @param {string=} searchStartDir Directory to resolve the correct module location from
 * @returns {[string, RegExp]}
 */
function resolveUniqueModule(packageName, searchStartDir) {
  const result = resolveModule(packageName, searchStartDir);
  if (!result) {
    throw new Error(`Cannot find module '${packageName}'`);
  }

  // Find the node_modules folder and account for cases when packages are
  // nested within workspace folders. Examples:
  // - path/to/node_modules/@babel/runtime
  // - path/to/node_modules/prop-types
  const owningDir = path.dirname(result.slice(0, -packageName.length));
  const escapedPath = owningDir.replace(/[+.\\]/g, "\\$&");
  const escapedPackageName = path.normalize(packageName).replace(/\\/g, "\\\\");

  const exclusionRE = new RegExp(
    `(?<!${escapedPath})\\${path.sep}node_modules\\${path.sep}${escapedPackageName}\\${path.sep}.*`
  );
  return [result, exclusionRE];
}

/**
 * Resolves modules that need to be unique.
 * @param {string[]} modules
 * @param {string} projectRoot
 * @returns {Record<string, string>}
 */
function resolveUniqueModules(modules, projectRoot) {
  /** @type Record<string, string> */
  const extraModules = {};
  for (const name of modules) {
    const resolvedPath = resolveModule(name, projectRoot);
    if (resolvedPath) {
      extraModules[name] = resolvedPath;
    }
  }

  // Additional modules that often cause issues in pnpm setups

  /** @type {(prev: string | undefined, curr: string) => string | undefined} */
  const chainedResolve = (prev, curr) =>
    prev ? resolveModule(curr, prev) : undefined;

  const metroDir = findMetroPath(projectRoot) || require.resolve("metro");
  const babelRuntime =
    // Starting with `metro` 0.71.0, `@babel/runtime` can be found through
    // `metro` -> `metro-runtime`
    ["metro-runtime", "@babel/runtime"].reduce(chainedResolve, metroDir) ||
    // Prior to `metro` 0.71.0, we can find `@babel/runtime` by going through
    // `metro-react-native-babel-preset`
    //     -> `@babel/plugin-transform-regenerator`
    //     -> `regenerator-transform`
    [
      "metro-react-native-babel-preset",
      "@babel/plugin-transform-regenerator",
      "regenerator-transform",
      "@babel/runtime",
    ].reduce(chainedResolve, projectRoot);
  if (babelRuntime) {
    extraModules["@babel/runtime"] = babelRuntime;
  }

  return extraModules;
}

/**
 * Returns a regex to exclude extra copies of specified package.
 *
 * Note that when using this function to exclude packages, you should also add
 * the path to the correct copy in `extraNodeModules` so Metro can resolve them
 * when referenced from modules that are siblings of the module that has them
 * installed. You should also restart Watchman and reset Metro cache if you're
 * adding/removing excludes.
 *
 * @see exclusionList for further information.
 *
 * @param {string} packageName Name of the package to exclude extra copies of
 * @param {string=} searchStartDir Directory to resolve the correct module location from
 * @returns {RegExp}
 */
function excludeExtraCopiesOf(packageName, searchStartDir) {
  const [, exclusionRE] = resolveUniqueModule(packageName, searchStartDir);
  return exclusionRE;
}

/**
 * Helper function for generating a package exclusion list.
 *
 * One of the most important things this function does is to exclude extra
 * copies of packages that cannot have duplicates, e.g. `react` and
 * `react-native`. But with how Metro currently resolves modules, some packages
 * will not be able to find them if a local copy exists. For instance, in the
 * below scenario, Metro cannot resolve `react-native` in
 * `another-awesome-package` because it does not look in `my-awesome-package`.
 * To help Metro, we will also need to add a corresponding entry to
 * `extraNodeModules`.
 *
 *     workspace
 *     ├── node_modules
 *     │   └── react-native@0.62.2  <-- should be ignored
 *     └── packages
 *         ├── my-awesome-package
 *         │   └── node_modules
 *         │       └── react-native@0.61.5  <-- should take precedence
 *         └── another-awesome-package  <-- imported by my-awesome-package,
 *                                          but uses workspace's react-native
 *
 * @param {(string | RegExp)[]=} additionalExclusions
 * @param {string=} projectRoot
 * @returns {RegExp}
 */
function exclusionList(additionalExclusions = [], projectRoot = process.cwd()) {
  /** @type {(additionalExclusions: (string | RegExp)[]) => RegExp} */
  const exclusionList = (() => {
    const metroConfigDir = resolveModule(
      "metro-config",
      findMetroPath(projectRoot)
    );
    try {
      return require(`${metroConfigDir}/src/defaults/exclusionList`);
    } catch (_) {
      // `blacklist` was renamed to `exclusionList` in 0.60
      return require(`${metroConfigDir}/src/defaults/blacklist`);
    }
  })();

  return exclusionList([
    ...UNIQUE_PACKAGES.map((name) => excludeExtraCopiesOf(name, projectRoot)),

    // Ignore temporary directories generated by build tools
    /.*\/(\.vs|\.vscode|Pods)\/.*/,

    // Ignore unrelated file changes
    /.*\.(apk|appx|bak|bat|binlog|c|cache|cc|class|cpp|cs|dex|dll|env|exe|flat|gz|h|hpp|jar|lock|m|mm|modulemap|o|obj|pch|pdb|plist|pbxproj|sh|so|tflite|tgz|tlog|xcconfig|xcscheme|xcworkspacedata|zip)$/,

    ...additionalExclusions,
  ]);
}

module.exports = {
  defaultWatchFolders,
  excludeExtraCopiesOf,
  exclusionList,
  resolveUniqueModule,

  /**
   * Helper function for configuring Metro.
   * @param {MetroConfig=} customConfig
   * @returns {MetroConfig}
   */
  makeMetroConfig: (customConfig = {}) => {
    const projectRoot = customConfig.projectRoot || process.cwd();

    const { mergeConfig } = requireModuleFromMetro("metro-config", projectRoot);
    const { enhanceMiddleware } = require("./assetPluginForMonorepos");
    const { getDefaultConfig } = require("./defaultConfig");

    const blockList = exclusionList([], projectRoot);
    const customBlockList =
      customConfig.resolver &&
      (customConfig.resolver.blockList || customConfig.resolver.blacklistRE);

    const [defaultConfig, ...configs] = [
      ...getDefaultConfig(projectRoot),
      {
        resolver: {
          resolverMainFields: ["react-native", "browser", "main"],
          blacklistRE: blockList, // For Metro < 0.60
          blockList, // For Metro >= 0.60
        },
        server: {
          enhanceMiddleware,
        },
        transformer: {
          getTransformOptions: async () => ({
            transform: {
              experimentalImportSupport: false,
              inlineRequires: false,
            },
          }),
        },
        watchFolders: customConfig.watchFolders ?? defaultWatchFolders(),
      },
      {
        ...customConfig,
        resolver: {
          ...customConfig.resolver,
          ...(customBlockList
            ? {
                // Metro introduced `blockList` in 0.60, but still prefers
                // `blacklistRE` if it is also set. We set both to ensure that
                // the blocks get applied.
                blacklistRE: customBlockList,
                blockList: customBlockList,
              }
            : {}),
          extraNodeModules: {
            /**
             * Ensure that Metro is able to resolve packages that cannot be
             * duplicated.
             * @see exclusionList for further information.
             */
            ...resolveUniqueModules(UNIQUE_PACKAGES, projectRoot),
            ...(customConfig.resolver
              ? customConfig.resolver.extraNodeModules
              : {}),
          },
        },
      },
    ];
    return mergeConfig(defaultConfig, ...configs);
  },
};
