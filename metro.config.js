const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports if needed
config.resolver.unstable_enablePackageExports = false;

module.exports = config;