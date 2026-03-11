import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri expects the app to run on a specific port
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Path aliases for cleaner imports
  resolve: {
    dedupe: [
      "gl-matrix",
      "@kitware/vtk.js",
      "dicom-parser",
      "comlink",
      "loglevel",
      "jpeg-lossless-decoder-js",
      "lodash.get",
      "d3-interpolate",
      "d3-array",
    ],
    alias: {
      // Application aliases
      "@": path.resolve(__dirname, "./src"),
      "@vendor": path.resolve(__dirname, "../vendor"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@store": path.resolve(__dirname, "./src/store"),

      // Vendor Cornerstone3D packages (core via shim so default export exists for ESM)
      "@cornerstonejs/core": path.resolve(
        __dirname,
        "src/lib/cornerstone-core-shim.ts"
      ),
      "@cornerstonejs/tools": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/tools/dist/esm"
      ),
      "@cornerstonejs/dicom-image-loader": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/dicom-image-loader/dist/esm"
      ),
      // Codec decodewasmjs: ESM wrappers (vendor files are UMD/CJS, no ESM default)
      "@cornerstonejs/codec-openjpeg/decodewasmjs": path.resolve(
        __dirname,
        "src/lib/codecs/openjpeg-decodewasmjs.ts"
      ),
      "@cornerstonejs/codec-openjpeg/decodewasm": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-openjpeg/dist/openjpegwasm_decode.wasm"
      ),
      "@cornerstonejs/codec-charls/decodewasmjs": path.resolve(
        __dirname,
        "src/lib/codecs/charls-decodewasmjs.ts"
      ),
      "@cornerstonejs/codec-charls/decodewasm": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-charls/dist/charlswasm_decode.wasm"
      ),
      "@cornerstonejs/codec-openjph/wasmjs": path.resolve(
        __dirname,
        "src/lib/codecs/openjph-wasmjs.ts"
      ),
      "@cornerstonejs/codec-openjph/wasm": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-openjph/dist/openjphjs.wasm"
      ),
      "@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasmjs": path.resolve(
        __dirname,
        "src/lib/codecs/libjpeg-turbo-8bit-decodewasmjs.ts"
      ),
      "@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasm": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-libjpeg-turbo-8bit/dist/libjpegturbowasm_decode.wasm"
      ),
      // Codec package roots (for any default or other imports)
      "@cornerstonejs/codec-openjpeg": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-openjpeg"
      ),
      "@cornerstonejs/codec-libjpeg-turbo-8bit": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-libjpeg-turbo-8bit"
      ),
      "@cornerstonejs/codec-charls": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-charls"
      ),
      "@cornerstonejs/codec-openjph": path.resolve(
        __dirname,
        "../vendor/cornerstone3d/codec-openjph"
      ),
    },
  },

  // Build configuration for Tauri
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  // Pre-bundle deps used by vendored Cornerstone so they resolve from app node_modules
  optimizeDeps: {
    include: [
      "gl-matrix",
      "@kitware/vtk.js",
      "dicom-parser",
      "comlink",
      "loglevel",
      "jpeg-lossless-decoder-js",
      "lodash.get",
      "d3-interpolate",
      "d3-array",
    ],
  },

  // Environment variables
  envPrefix: ["VITE_", "TAURI_"],

  // Clear console on restart
  clearScreen: false,
});
