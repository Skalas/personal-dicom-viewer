/**
 * ESM wrapper for codec-charls decodewasmjs (UMD/CJS has no ESM default).
 */
// @ts-expect-error CJS/UMD module
import * as M from "@vendor/cornerstone3d/codec-charls/dist/charlswasm_decode.js";
export default (M as { default?: unknown }).default ?? M;
