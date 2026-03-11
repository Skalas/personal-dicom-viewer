/**
 * ESM wrapper for codec-openjpeg decodewasmjs (UMD/CJS has no ESM default).
 */
// @ts-expect-error CJS/UMD module
import * as M from "@vendor/cornerstone3d/codec-openjpeg/dist/openjpegwasm_decode.js";
export default (M as { default?: unknown }).default ?? M;
