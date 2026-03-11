/**
 * Helpers for the custom dicom-file:// protocol.
 * Used to build Cornerstone imageIds that load DICOM files via Tauri's protocol handler.
 */

/**
 * Converts a local file path to a dicom-file:// URL.
 * Used to build imageIds for the wadouri loader: "wadouri:" + getDicomFileUrl(path).
 *
 * @param filePath - Absolute path to the DICOM file on disk
 * @returns URL string using the dicom-file:// protocol
 */
export function getDicomFileUrl(filePath: string): string {
  const encodedPath = encodeURI(filePath);
  return `dicom-file://${encodedPath}`;
}
