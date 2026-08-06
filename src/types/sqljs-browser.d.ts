// sql.js punya dua build: default (memakai require("node:fs"/"node:crypto"))
// dan khusus browser. Build browser dipakai supaya Metro web tidak gagal
// me-resolve modul node bawaan.
declare module "sql.js/dist/sql-wasm-browser.js" {
  import type { SqlJsConfig, SqlJsStatic } from "sql.js";

  const initSqlJs: (config?: SqlJsConfig) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
