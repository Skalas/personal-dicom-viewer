import { useState } from "react";
import type { DicomStudy, DicomSeries } from "../../store/types";
import { Card, CardHeader, CardTitle, CardContent } from "../../components";
import { SeriesItem } from "./SeriesItem";
import { invoke } from "@tauri-apps/api/tauri";

interface StudyCardProps {
  study: DicomStudy;
  selectedSeriesId: string | null;
  onSeriesSelect: (series: DicomSeries) => void;
}

/**
 * Formats a DICOM date (YYYYMMDD) to a readable format
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr || dateStr.length !== 8) return "Unknown date";

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * StudyCard component displays a DICOM study with expandable series list
 */
export function StudyCard({
  study,
  selectedSeriesId,
  onSeriesSelect,
}: StudyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <Card className="mb-3">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors p-4"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {study.studyDescription || "Untitled Study"}
            </CardTitle>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Patient: {study.patientName || "Unknown"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Date: {formatDate(study.studyDate)} • {study.seriesCount}{" "}
                series
              </p>
            </div>
          </div>
          <div className="ml-2 flex-shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="space-y-1">
            {study.series.map((series) => (
              <SeriesItem
                key={series.seriesInstanceUid}
                series={series}
                isSelected={
                  selectedSeriesId === series.seriesInstanceUid
                }
                onSelect={() => onSeriesSelect(series)}
              />
            ))}
          </div>

          {study.reportFiles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Reports
              </p>
              <div className="space-y-1">
                {study.reportFiles.map((filePath) => {
                  const fileName = filePath.split("/").pop() ?? filePath;
                  return (
                    <button
                      key={filePath}
                      onClick={(e) => {
                        e.stopPropagation();
                        invoke("open_file_external", { path: filePath }).catch(console.error);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors"
                    >
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-amber-800 dark:text-amber-300 truncate">
                        {fileName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
