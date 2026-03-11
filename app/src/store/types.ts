/**
 * Type definitions for the application store
 * These types match the Rust backend's serialized output (camelCase)
 */

/**
 * Represents a single DICOM instance (image file)
 * Matches DicomInstance from Rust backend
 */
export interface DicomInstance {
  sopInstanceUid: string;
  instanceNumber: number | null;
  filePath: string;
  fileSize: number;
}

/**
 * Represents a DICOM series within a study
 * Matches DicomSeries from Rust backend
 */
export interface DicomSeries {
  seriesInstanceUid: string;
  seriesNumber: number | null;
  seriesDescription: string | null;
  modality: string | null;
  instanceCount: number;
  instances: DicomInstance[];
}

/**
 * Represents a DICOM study containing multiple series
 * Matches DicomStudy from Rust backend
 */
export interface DicomStudy {
  studyInstanceUid: string;
  studyDescription: string | null;
  studyDate: string | null;
  patientName: string | null;
  patientId: string | null;
  seriesCount: number;
  series: DicomSeries[];
  reportFiles: string[];
}

/**
 * Scan result from backend
 * Matches ScanResult from Rust backend
 */
export interface ScanResult {
  studies: DicomStudy[];
  totalFiles: number;
  failedFiles: number;
  errors: string[];
}

/**
 * Loading state for async operations
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Error information
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * A single DICOM metadata tag
 */
export interface DicomTag {
  tag: string;
  name: string;
  vr: string;
  value: string;
}

/**
 * Viewport state for image rendering
 */
export interface ViewportState {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  currentImageIndex: number;
  totalImages: number;
}
