import type { DicomSeries } from "../../store/types";
import { cn } from "../../lib/utils";

interface SeriesItemProps {
  series: DicomSeries;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * SeriesItem component displays a single DICOM series in a list
 */
export function SeriesItem({ series, isSelected, onSelect }: SeriesItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        isSelected &&
          "bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isSelected
                ? "text-blue-900 dark:text-blue-100"
                : "text-gray-900 dark:text-gray-100"
            )}
          >
            {series.seriesDescription || "Untitled Series"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {series.modality && (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  isSelected
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                )}
              >
                {series.modality}
              </span>
            )}
            {series.seriesNumber !== null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                #{series.seriesNumber}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {series.instanceCount} images
        </div>
      </div>
    </button>
  );
}
