const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Izinkan Metro me-bundle file .wasm (dipakai sql.js untuk database log lokal).
config.resolver.assetExts.push("wasm");

module.exports = config;
