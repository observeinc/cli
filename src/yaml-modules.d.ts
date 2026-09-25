// Bun inlines `*.yaml` / `*.yml` imports as parsed data at build and run time.
// tsc does not know that, so declare the module shape here. The value is
// validated with zod at load time (see manifest/load.ts), hence `unknown`.
declare module "*.yaml" {
  const value: unknown;
  export default value;
}

declare module "*.yml" {
  const value: unknown;
  export default value;
}
