const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    // scripts/archive/** adalah tool sekali-pakai yang sudah diarsipkan —
    // tidak di-lint supaya `bun lint` tetap bersih untuk kode aktif.
    ignores: ["node_modules/**", "dist/**", ".expo/**", "scripts/archive/**"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
  // Node globals untuk script tooling (*.mjs / *.js di luar src/)
  // Catatan: source TS (src/) tidak di-lint ESLint — cukup di-cover tsc.
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  // Relax aturan spasial & escape pada regex script tooling — pola pencarian
  // verbose yang sudah teruji jalan (escape \" dipakai agar pola konsisten
  // dengan representasi string TS), bukan kode produksi.
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-regex-spaces": "off",
      "no-useless-escape": "off",
    },
  },
];
