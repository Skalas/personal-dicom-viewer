import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  DicomStudy,
  DicomSeries,
  DicomTag,
  LoadingState,
  ErrorInfo,
  ViewportState,
} from "./types";

/**
 * Application state interface
 */
interface AppState {
  // Study Browser state
  studies: DicomStudy[];
  selectedStudy: DicomStudy | null;
  selectedSeries: DicomSeries | null;
  studiesLoadingState: LoadingState;
  studiesError: ErrorInfo | null;

  // Viewport state
  viewportState: ViewportState | null;

  // Metadata state
  metadata: DicomTag[];
  metadataLoading: boolean;

  // Actions
  setStudies: (studies: DicomStudy[]) => void;
  setSelectedStudy: (study: DicomStudy | null) => void;
  setSelectedSeries: (series: DicomSeries | null) => void;
  setStudiesLoadingState: (state: LoadingState) => void;
  setStudiesError: (error: ErrorInfo | null) => void;
  setViewportState: (state: ViewportState | null) => void;
  updateViewportState: (updates: Partial<ViewportState>) => void;
  setMetadata: (tags: DicomTag[]) => void;
  setMetadataLoading: (loading: boolean) => void;
  resetStore: () => void;
}

/**
 * Initial viewport state
 */
const initialViewportState: ViewportState = {
  windowWidth: 400,
  windowCenter: 40,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  rotation: 0,
  currentImageIndex: 0,
  totalImages: 0,
};

/**
 * Initial application state
 */
const initialState = {
  studies: [],
  selectedStudy: null,
  selectedSeries: null,
  studiesLoadingState: "idle" as LoadingState,
  studiesError: null,
  viewportState: null,
  metadata: [],
  metadataLoading: false,
};

/**
 * Main application store using Zustand
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,

      setStudies: (studies) => set({ studies }),

      setSelectedStudy: (study) =>
        set({
          selectedStudy: study,
          selectedSeries: null,
        }),

      setSelectedSeries: (series) =>
        set({
          selectedSeries: series,
          viewportState: series
            ? {
                ...initialViewportState,
                totalImages: series.instanceCount,
              }
            : null,
          metadata: [],
        }),

      setStudiesLoadingState: (state) => set({ studiesLoadingState: state }),

      setStudiesError: (error) => set({ studiesError: error }),

      setViewportState: (state) => set({ viewportState: state }),

      updateViewportState: (updates) =>
        set((state) => ({
          viewportState: state.viewportState
            ? { ...state.viewportState, ...updates }
            : null,
        })),

      setMetadata: (metadata) => set({ metadata }),

      setMetadataLoading: (metadataLoading) => set({ metadataLoading }),

      resetStore: () => set(initialState),
    }),
    {
      name: "dicom-viewer-store",
    }
  )
);

/**
 * Selectors for accessing specific parts of the store
 */
export const selectStudies = (state: AppState) => state.studies;
export const selectSelectedStudy = (state: AppState) => state.selectedStudy;
export const selectSelectedSeries = (state: AppState) => state.selectedSeries;
export const selectStudiesLoadingState = (state: AppState) =>
  state.studiesLoadingState;
export const selectStudiesError = (state: AppState) => state.studiesError;
export const selectViewportState = (state: AppState) => state.viewportState;
