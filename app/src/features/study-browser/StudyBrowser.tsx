import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../../store";
import type { DicomSeries } from "../../store/types";
import { Button } from "../../components";
import { selectDirectory, scanDicomDirectory, isTauri } from "../../lib/tauri";
import { StudyCard } from "./StudyCard";

/**
 * StudyBrowser component
 *
 * Main component for browsing and selecting DICOM studies and series.
 * Features:
 * - Directory selection via Tauri file dialog
 * - Display list of scanned studies grouped by Study
 * - Show series within each study
 * - Handle loading and error states
 */
export function StudyBrowser() {
  const studies = useAppStore((state) => state.studies);
  const selectedSeries = useAppStore((state) => state.selectedSeries);
  const loadingState = useAppStore((state) => state.studiesLoadingState);
  const error = useAppStore((state) => state.studiesError);
  const [scanProgress, setScanProgress] = useState<{
    scanned: number;
    found: number;
  } | null>(null);

  // Listen for scan-progress events from the backend
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ scanned: number; found: number }>("scan-progress", (event) => {
        setScanProgress(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const setStudies = useAppStore((state) => state.setStudies);
  const setSelectedStudy = useAppStore((state) => state.setSelectedStudy);
  const setSelectedSeries = useAppStore((state) => state.setSelectedSeries);
  const setLoadingState = useAppStore((state) => state.setStudiesLoadingState);
  const setError = useAppStore((state) => state.setStudiesError);

  /**
   * Handles folder selection and DICOM scanning
   */
  const handleSelectFolder = useCallback(async () => {
    try {
      setError(null);

      // Open directory picker
      const selectedPath = await selectDirectory();
      if (!selectedPath) {
        // User cancelled
        return;
      }

      // Start loading
      setLoadingState("loading");
      setScanProgress(null);

      // Scan the directory
      const result = await scanDicomDirectory(selectedPath);

      // Update store with results
      setStudies(result.studies);
      setLoadingState("success");
      setScanProgress(null);

      // Log scan results
      console.log(
        `Scanned ${result.totalFiles} files, found ${result.studies.length} studies`
      );
      if (result.failedFiles > 0) {
        console.warn(`Failed to parse ${result.failedFiles} files`);
        if (result.errors.length > 0) {
          console.warn("Errors:", result.errors.slice(0, 5));
        }
      }
    } catch (err) {
      console.error("Failed to scan directory:", err);
      setLoadingState("error");
      setError({
        message:
          err instanceof Error ? err.message : "Failed to scan directory",
      });
    }
  }, [setStudies, setLoadingState, setError]);

  /**
   * Handles series selection
   */
  const handleSeriesSelect = useCallback(
    (series: DicomSeries) => {
      // Find the parent study
      const parentStudy = studies.find((study) =>
        study.series.some((s) => s.seriesInstanceUid === series.seriesInstanceUid)
      );

      if (parentStudy) {
        setSelectedStudy(parentStudy);
      }
      setSelectedSeries(series);

      console.log("Selected series:", series.seriesDescription);
    },
    [studies, setSelectedStudy, setSelectedSeries]
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header with folder selection */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Study Browser
        </h2>
        {!isTauri() && (
          <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
            Run with <code className="rounded bg-gray-200 dark:bg-gray-700 px-1">cargo tauri dev</code> to use folder selection.
          </p>
        )}
        <Button
          onClick={handleSelectFolder}
          className="w-full"
          isLoading={loadingState === "loading"}
          disabled={loadingState === "loading" || !isTauri()}
        >
          {loadingState === "loading" ? "Scanning..." : "Open Folder"}
        </Button>

        {/* Scan summary */}
        {studies.length > 0 && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {studies.length} {studies.length === 1 ? "study" : "studies"} loaded
          </p>
        )}
      </div>

      {/* Study list */}
      <div className="flex-1 overflow-auto p-4">
        {/* Error state */}
        {error && (
          <div
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800"
            role="alert"
          >
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Error scanning directory
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {error.message}
            </p>
          </div>
        )}

        {/* Empty state */}
        {studies.length === 0 && loadingState !== "loading" && !error && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="mt-2">No studies loaded</p>
            <p className="text-sm mt-1">
              Click "Open Folder" to scan for DICOM files
            </p>
          </div>
        )}

        {/* Loading state */}
        {loadingState === "loading" && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="mt-2">Scanning directory...</p>
            {scanProgress && (
              <p className="text-xs mt-1">
                {scanProgress.scanned} files scanned, {scanProgress.found} DICOM found
              </p>
            )}
          </div>
        )}

        {/* Study cards */}
        {studies.length > 0 && loadingState !== "loading" && (
          <div>
            {studies.map((study) => (
              <StudyCard
                key={study.studyInstanceUid}
                study={study}
                selectedSeriesId={selectedSeries?.seriesInstanceUid ?? null}
                onSeriesSelect={handleSeriesSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
