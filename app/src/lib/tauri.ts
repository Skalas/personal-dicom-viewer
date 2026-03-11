import { invoke } from "@tauri-apps/api/tauri";
import type { ScanResult } from "../store/types";

/** Tauri v1 injects __TAURI_IPC__ in the webview; absent when running in a normal browser. */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __TAURI_IPC__?: unknown };
  return typeof w.__TAURI_IPC__ === "function";
}

const NOT_TAURI_MESSAGE =
  "This feature requires the Tauri app. Run the app with: cargo tauri dev";

/**
 * Reads a DICOM file from disk via Tauri and returns its contents as ArrayBuffer.
 * Backend returns base64; we decode here. Tauri v1 lacks efficient binary IPC,
 * so base64 (+33% size) is faster than Vec<u8> which serializes as a JSON number[].
 */
export async function readDicomFile(path: string): Promise<ArrayBuffer> {
  if (!isTauri()) {
    throw new Error(NOT_TAURI_MESSAGE);
  }
  const base64 = await invoke<string>("read_dicom_file", { path });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Opens a native directory picker dialog via a Tauri backend command.
 *
 * @returns The selected directory path, or null if cancelled.
 */
export async function selectDirectory(): Promise<string | null> {
  if (!isTauri()) {
    throw new Error(NOT_TAURI_MESSAGE);
  }
  try {
    const selected = await invoke<string | null>("select_directory");
    return selected ?? null;
  } catch (error) {
    console.error("Failed to open directory picker:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Failed to open directory picker";
    throw new Error(message);
  }
}

/**
 * Invokes the backend command to scan a directory for DICOM files
 * @param path - The directory path to scan
 * @returns The scan results containing studies, series, and instances
 */
export async function scanDicomDirectory(path: string): Promise<ScanResult> {
  if (!isTauri()) {
    throw new Error(NOT_TAURI_MESSAGE);
  }
  try {
    const result = await invoke<ScanResult>("scan_dicom_directory", { path });
    return result;
  } catch (error) {
    console.error("Failed to scan directory:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to scan directory"
    );
  }
}

/**
 * Fetches DICOM metadata tags for a given file path.
 */
export async function getDicomMetadata(
  path: string
): Promise<DicomTag[]> {
  if (!isTauri()) {
    throw new Error(NOT_TAURI_MESSAGE);
  }
  const result = await invoke<DicomTag[]>("get_dicom_metadata", { path });
  return result;
}

export interface DicomTag {
  tag: string;
  name: string;
  vr: string;
  value: string;
}

export interface SrTextBlock {
  conceptName: string | null;
  value: string;
}

export interface SrReport {
  patientName: string | null;
  studyDescription: string | null;
  completionFlag: string | null;
  verificationFlag: string | null;
  contentDate: string | null;
  contentTime: string | null;
  textBlocks: SrTextBlock[];
}

/**
 * Reads a DICOM Structured Report and extracts text content.
 */
export async function readSrReport(path: string): Promise<SrReport> {
  if (!isTauri()) {
    throw new Error(NOT_TAURI_MESSAGE);
  }
  return invoke<SrReport>("read_sr_report", { path });
}
