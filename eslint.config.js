const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    ignores: ["node_modules/**", "dist/**", ".expo/**"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
