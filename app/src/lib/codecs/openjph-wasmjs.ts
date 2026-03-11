/**
 * ESM wrapper for codec-openjph wasmjs (UMD/CJS has no ESM default).
 */
// @ts-expect-error CJS/UMD module
import * as M from "@vendor/cornerstone3d/codec-openjph/dist/openjphjs.js";
export default (M as { default?: unknown }).default ?? M;
