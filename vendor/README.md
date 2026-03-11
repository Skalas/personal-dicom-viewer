# Vendored Dependencies

This directory contains vendored (copied) dependencies that are critical to the application's long-term stability. Vendoring ensures that even if packages are removed from npm or significantly changed, we maintain a working copy.

## Why Vendor?

**Cornerstone3D** is vendored because:
1. **Medical imaging stability** - Changes to rendering libraries could affect diagnostic accuracy
2. **Regulatory considerations** - Maintaining exact versions helps with validation and compliance
3. **Long-term availability** - Ensures the viewer remains functional even if packages are deprecated
4. **Reproducible builds** - Guarantees the same code is used across all builds and deployments

## Vendored Packages

### Cornerstone3D Packages (v4.15.30)

- `@cornerstonejs/core` - Core rendering engine
- `@cornerstonejs/tools` - Annotation and manipulation tools
- `@cornerstonejs/dicom-image-loader` - DICOM file loading and parsing
- `@cornerstonejs/codec-openjpeg` - JPEG2000 codec (WASM)
- `@cornerstonejs/codec-libjpeg-turbo-8bit` - JPEG codec
- `@cornerstonejs/codec-charls` - JPEG-LS codec
- `@cornerstonejs/codec-openjph` - High-throughput JPEG2000 codec

## Vendoring Process

### Initial Vendor (Already Done)

The packages were vendored using the script in `scripts/vendor-cornerstone.sh`.

### Updating Vendored Packages

To update to a new version:

1. Update the versions in `app/package.json`
2. Run `npm install` in the `app/` directory
3. Run the vendor script: `./scripts/vendor-cornerstone.sh`
4. Test thoroughly before committing
5. Document the version change in this README

### Manual Vendoring

If you need to vendor manually:

```bash
# From project root
cp -r app/node_modules/@cornerstonejs vendor/cornerstone3d/
```

## Using Vendored Packages

The Vite configuration in `app/vite.config.ts` is set up to resolve `@cornerstonejs/*` imports from the `vendor/` directory instead of `node_modules/`.

This happens automatically - no changes needed in application code.

## Version History

- **2026-02-06**: Initial vendor of Cornerstone3D v4.15.30
  - Includes core, tools, dicom-image-loader
  - Includes JPEG2000 (OpenJPEG and OpenJPH), JPEG-Turbo, and JPEG-LS codecs

## License Information

All Cornerstone3D packages are licensed under the MIT License.

See individual package directories for full license texts:
- `vendor/cornerstone3d/core/LICENSE`
- `vendor/cornerstone3d/tools/LICENSE`
- `vendor/cornerstone3d/dicom-image-loader/LICENSE`

## Testing After Vendoring

After vendoring or updating packages, run:

```bash
cd app
npm run build  # Ensure build succeeds
npm run dev    # Test in development mode
```

Load a DICOM study and verify:
- Images render correctly
- All codecs work (test JPEG2000, JPEG, JPEG-LS)
- Tools function properly (zoom, pan, window/level)
- No console errors related to missing modules
