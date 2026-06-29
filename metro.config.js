const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Support .cjs files (required by Firebase JS SDK)
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = true;

// Force Metro to resolve bignumber.js to its CJS module rather than the browser script
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "bignumber.js") {
    return context.resolveRequest(context, "bignumber.js/dist/bignumber.cjs", platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
