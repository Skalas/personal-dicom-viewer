/**
 * ESM wrapper for codec-libjpeg-turbo-8bit decodewasmjs (UMD/CJS has no ESM default).
 */
// @ts-expect-error CJS/UMD module
import * as M from "@vendor/cornerstone3d/codec-libjpeg-turbo-8bit/dist/libjpegturbowasm_decode.js";
export default (M as { default?: unknown }).default ?? M;
