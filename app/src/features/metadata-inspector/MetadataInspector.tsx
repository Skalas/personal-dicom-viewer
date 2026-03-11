import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppStore } from "../../store";
import { getDicomMetadata } from "../../lib/tauri";

/**
 * MetadataInspector component
 *
 * Displays DICOM metadata tags for the current image.
 * Features: searchable tag table, click-to-copy values.
 */
export function MetadataInspector() {
  const selectedSeries = useAppStore((state) => state.selectedSeries);
  const viewportState = useAppStore((state) => state.viewportState);
  const metadata = useAppStore((state) => state.metadata);
  const metadataLoading = useAppStore((state) => state.metadataLoading);
  const setMetadata = useAppStore((state) => state.setMetadata);
  const setMetadataLoading = useAppStore((state) => state.setMetadataLoading);

  const [filter, setFilter] = useState("");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const currentIndex = viewportState?.currentImageIndex ?? 0;

  // Fetch metadata when series or slice changes
  useEffect(() => {
    if (!selectedSeries?.instances?.length) {
      setMetadata([]);
      return;
    }

    const sorted = selectedSeries.instances
      .slice()
      .sort((a, b) => (a.instanceNumber ?? 0) - (b.instanceNumber ?? 0));

    const instance = sorted[currentIndex];
    if (!instance) return;

    let cancelled = false;
    setMetadataLoading(true);

    getDicomMetadata(instance.filePath)
      .then((tags) => {
        if (!cancelled) {
          setMetadata(tags);
          setMetadataLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load metadata:", err);
          setMetadata([]);
          setMetadataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSeries?.seriesInstanceUid, currentIndex, setMetadata, setMetadataLoading]);

  const filteredTags = useMemo(() => {
    if (!filter) return metadata;
    const lower = filter.toLowerCase();
    return metadata.filter(
      (t) =>
        t.tag.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.value.toLowerCase().includes(lower)
    );
  }, [metadata, filter]);

  const handleCopy = useCallback(async (tag: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1500);
    } catch {
      // Clipboard may not be available
    }
  }, []);

  const hasInstances =
    selectedSeries != null && selectedSeries.instances.length > 0;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Metadata Inspector
        </h2>
        {hasInstances && (
          <input
            type="text"
            placeholder="Filter tags..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Metadata content */}
      <div className="flex-1 overflow-auto">
        {metadataLoading && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500" />
            <p className="mt-2 text-sm">Loading metadata...</p>
          </div>
        )}

        {!metadataLoading && !hasInstances && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8 px-4">
            <p>No metadata to display</p>
            <p className="text-sm mt-2">Load an image to view its metadata</p>
          </div>
        )}

        {!metadataLoading && hasInstances && filteredTags.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8 px-4">
            <p className="text-sm">
              {filter ? "No tags match your filter" : "No tags found"}
            </p>
          </div>
        )}

        {!metadataLoading && filteredTags.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="px-2 py-1.5 font-medium">Tag</th>
                <th className="px-2 py-1.5 font-medium">VR</th>
                <th className="px-2 py-1.5 font-medium">Name</th>
                <th className="px-2 py-1.5 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((t) => (
                <tr
                  key={t.tag}
                  className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleCopy(t.tag, t.value)}
                  title="Click to copy value"
                >
                  <td className="px-2 py-1 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {t.tag}
                  </td>
                  <td className="px-2 py-1 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t.vr}
                  </td>
                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {t.name}
                  </td>
                  <td className="px-2 py-1 text-gray-900 dark:text-gray-100 break-all max-w-[200px]">
                    {copiedTag === t.tag ? (
                      <span className="text-green-500">Copied!</span>
                    ) : (
                      t.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
