/**
 * Registers the tauri-dicom image loader with Cornerstone.
 * Uses Tauri invoke to read file bytes when the webview's XHR cannot load dicom-file:// URLs.
 */
import { registerImageLoader, metaData } from "@cornerstonejs/core";
import * as dicomLoader from "@cornerstonejs/dicom-image-loader";
import getPixelDataWadouri from "@cornerstonejs/dicom-image-loader/imageLoader/wadouri/getPixelData";
import { metadataForDataset } from "@cornerstonejs/dicom-image-loader/imageLoader/wadouri/metaData/metaDataProvider";
import * as dicomParserModule from "dicom-parser";
import { readDicomFile } from "./tauri";

const parseDicom =
  (dicomParserModule as { parseDicom?: (arr: Uint8Array) => unknown }).parseDicom ??
  (dicomParserModule as { default?: { parseDicom: (arr: Uint8Array) => unknown } }).default?.parseDicom;

const createImage = (dicomLoader as { createImage: (id: string, pixelData: unknown, transferSyntax: string, opts: unknown) => Promise<unknown> }).createImage;

const SCHEME = "tauri-dicom";

// Cache parsed datasets so the metadata provider can look them up by imageId
const dataSetCache = new Map<string, unknown>();

function tauriDicomMetadataProvider(type: string, imageId: string) {
  if (!imageId.startsWith(SCHEME + ":")) return;
  const dataSet = dataSetCache.get(imageId);
  if (!dataSet) return;
  return metadataForDataset(type, imageId, dataSet);
}

function parseImageId(imageId: string): { path: string; frame: number } {
  const colon = imageId.indexOf(":");
  const url = imageId.slice(colon + 1);
  const frameMatch = url.match(/frame=(\d+)/);
  const frame = frameMatch ? parseInt(frameMatch[1], 10) - 1 : 0;
  const path = frameMatch ? url.slice(0, url.indexOf("frame=") - 1) : url;
  return { path: decodeURIComponent(path), frame: frame >= 0 ? frame : 0 };
}

function loadImage(
  imageId: string,
  options: Record<string, unknown> = {}
): { promise: Promise<unknown>; cancelFn: undefined } {
  const { path, frame } = parseImageId(imageId);

  if (!parseDicom) {
    return {
      promise: Promise.reject(new Error("dicom-parser parseDicom not found")),
      cancelFn: undefined,
    };
  }

  const promise = readDicomFile(path)
    .then((arrayBuffer) => {
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = parseDicom(byteArray);

      // Cache the dataset so our metadata provider can serve it to createImage
      dataSetCache.set(imageId, dataSet);

      const pixelData = getPixelDataWadouri(dataSet, frame);
      if (!pixelData) {
        throw new Error("No pixel data in DICOM");
      }
      const transferSyntax = (dataSet as { string: (tag: string) => string | undefined }).string("x00020010") ?? "";
      return createImage(imageId, pixelData, transferSyntax, options ?? {}).then(
        (image: unknown) => {
          if (image && typeof image === "object" && image !== null) {
            (image as { data?: unknown }).data = dataSet;
          }
          return image;
        }
      );
    });

  return { promise, cancelFn: undefined };
}

export function registerTauriDicomLoader(): void {
  registerImageLoader(SCHEME, loadImage);
  metaData.addProvider(tauriDicomMetadataProvider);
}
