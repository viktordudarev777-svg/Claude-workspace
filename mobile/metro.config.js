const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Monorepo setup. Metro only watches the project directory by default, so
// @foodlens/engine — which lives outside it — would neither resolve nor
// hot-reload without this.
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// npm hoists most packages to the workspace root; leaving hierarchical lookup
// on lets Metro find them there.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
