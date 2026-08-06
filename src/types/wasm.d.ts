// Deklarasi tipe untuk file .wasm yang di-bundle Metro sebagai asset.
// Di platform web, Metro mengubah asset menjadi string URL asset.
declare module "*.wasm" {
  const url: string;
  export default url;
}
