/**
 * Shim for @cornerstonejs/core so that ESM resolution always has a default export.
 * The vendor core index only has named exports + export *; some tooling expects a default.
 */
import * as core from "@vendor/cornerstone3d/core/dist/esm/index.js";

export default core;
export * from "@vendor/cornerstone3d/core/dist/esm/index.js";
