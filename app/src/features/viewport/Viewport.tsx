import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "../../store";
import { getDicomFileUrl } from "../../lib/protocol";
import { isTauri, readSrReport } from "../../lib/tauri";
import type { SrReport } from "../../lib/tauri";
import { registerTauriDicomLoader } from "../../lib/tauri-dicom-loader";

// Cornerstone3D core
import {
  init as csInit,
  isCornerstoneInitialized,
  RenderingEngine,
  getRenderingEngine,
  Enums,
  eventTarget,
} from "@cornerstonejs/core";
import * as dicomImageLoaderModule from "@cornerstonejs/dicom-image-loader";

// Cornerstone3D tools
import {
  init as csToolsInit,
  addTool,
  ToolGroupManager,
  StackScrollTool,
  WindowLevelTool,
  Enums as ToolEnums,
} from "@cornerstonejs/tools";

const dicomImageLoader =
  "default" in dicomImageLoaderModule
    ? (dicomImageLoaderModule as { default: { init: () => void } }).default
    : (dicomImageLoaderModule as unknown as { init: () => void });

const VIEWPORT_ID = "dicom-stack-viewport";
const RENDERING_ENGINE_ID = "dicom-rendering-engine";
const TOOL_GROUP_ID = "dicom-tool-group";

/**
 * Viewport component
 *
 * Renders DICOM images using Cornerstone3D StackViewport.
 * Supports: slice navigation (wheel/slider/keyboard), window/level (left-drag).
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const initRef = useRef(false);
  const [viewportError, setViewportError] = useState<string | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const [windowCenter, setWindowCenter] = useState<number | null>(null);
  const [srReport, setSrReport] = useState<SrReport | null>(null);

  const selectedSeries = useAppStore((state) => state.selectedSeries);
  const updateViewportState = useAppStore((state) => state.updateViewportState);

  const ensureCornerstoneInit = useCallback(() => {
    if (initRef.current) return;
    if (!isCornerstoneInitialized()) {
      csInit();
      dicomImageLoader.init();
      if (isTauri()) {
        registerTauriDicomLoader();
      }
    }

    initRef.current = true;

    // Initialize tools (non-critical — rendering works without them)
    try {
      csToolsInit();
      addTool(StackScrollTool);
      addTool(WindowLevelTool);

      const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
      if (toolGroup) {
        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(WindowLevelTool.toolName);

        toolGroup.setToolActive(StackScrollTool.toolName);

        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
        });
      }
    } catch (err) {
      console.warn("Cornerstone tools init failed (interactions disabled):", err);
    }
  }, []);

  const initRenderingEngine = useCallback(() => {
    const element = containerRef.current;
    if (!element) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let engine = getRenderingEngine(RENDERING_ENGINE_ID) as any;
    if (!engine) {
      engine = new RenderingEngine(RENDERING_ENGINE_ID);
      renderingEngineRef.current = engine;
    }

    try {
      engine.enableElement({
        element,
        viewportId: VIEWPORT_ID,
        type: Enums.ViewportType.STACK,
      });
    } catch {
      // Element may already be enabled (e.g. strict mode double mount)
    }

    // Add viewport to tool group
    const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (toolGroup) {
      try {
        toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
      } catch {
        // Already added
      }
    }

    return engine;
  }, []);

  const displaySeries = useCallback(
    async (imageIds: string[]) => {
      if (imageIds.length === 0) return;

      ensureCornerstoneInit();
      const engine = initRenderingEngine();
      if (!engine) return;

      const viewport = engine.getStackViewport(VIEWPORT_ID);
      if (!viewport) return;

      await viewport.setStack(imageIds, 0);
      viewport.resetCamera(true);
      engine.resize(true);
      viewport.render();

      setTotalSlices(imageIds.length);
      setCurrentSlice(0);

      // Read default W/L from the first image
      const voiRange = viewport.getProperties().voiRange;
      if (voiRange) {
        const ww = voiRange.upper - voiRange.lower;
        const wc = (voiRange.upper + voiRange.lower) / 2;
        setWindowWidth(Math.round(ww));
        setWindowCenter(Math.round(wc));
      }
    },
    [ensureCornerstoneInit, initRenderingEngine]
  );

  // Listen for image load errors on Cornerstone's global eventTarget
  useEffect(() => {
    const handleLoadError = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      const errorMsg =
        detail?.error?.message || detail?.error || "Unknown image load error";
      console.error("IMAGE_LOAD_ERROR:", detail);
      setViewportError(String(errorMsg));
    };

    eventTarget.addEventListener("IMAGE_LOAD_ERROR", handleLoadError);
    return () => {
      eventTarget.removeEventListener("IMAGE_LOAD_ERROR", handleLoadError);
    };
  }, []);

  // Listen for STACK_NEW_IMAGE and VOI_MODIFIED events on the viewport element
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleNewImage = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail?.imageIdIndex !== undefined) {
        setCurrentSlice(detail.imageIdIndex);
        updateViewportState({ currentImageIndex: detail.imageIdIndex });
      }
    };

    const handleVoiModified = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      const range = detail?.range;
      if (range) {
        const ww = Math.round(range.upper - range.lower);
        const wc = Math.round((range.upper + range.lower) / 2);
        setWindowWidth(ww);
        setWindowCenter(wc);
        updateViewportState({ windowWidth: ww, windowCenter: wc });
      }
    };

    element.addEventListener("CORNERSTONE_STACK_NEW_IMAGE", handleNewImage);
    element.addEventListener("CORNERSTONE_VOI_MODIFIED", handleVoiModified);

    return () => {
      element.removeEventListener(
        "CORNERSTONE_STACK_NEW_IMAGE",
        handleNewImage
      );
      element.removeEventListener(
        "CORNERSTONE_VOI_MODIFIED",
        handleVoiModified
      );
    };
  }, [updateViewportState]);

  // When selectedSeries changes, load and display (or show SR report)
  useEffect(() => {
    setViewportError(null);
    setSrReport(null);
    if (!selectedSeries?.instances?.length) return;

    const isSR = selectedSeries.modality === "SR";

    if (isSR) {
      // Load structured report text
      const firstInstance = selectedSeries.instances[0];
      readSrReport(firstInstance.filePath)
        .then(setSrReport)
        .catch((err) => {
          console.error("Failed to load SR report:", err);
          setViewportError(
            err instanceof Error ? err.message : "Failed to load report"
          );
        });
      return;
    }

    const imageIds = selectedSeries.instances
      .slice()
      .sort((a, b) => (a.instanceNumber ?? 0) - (b.instanceNumber ?? 0))
      .map((inst) =>
        isTauri()
          ? `tauri-dicom:${inst.filePath}`
          : `wadouri:${getDicomFileUrl(inst.filePath)}`
      );

    displaySeries(imageIds).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to display series:", err);
      setViewportError(message);
    });
  }, [selectedSeries?.seriesInstanceUid, displaySeries]);

  // Init viewport element on mount
  useEffect(() => {
    ensureCornerstoneInit();
    initRenderingEngine();

    const handleResize = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = getRenderingEngine(RENDERING_ENGINE_ID) as any;
      if (engine) (engine as RenderingEngine).resize(true);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [ensureCornerstoneInit, initRenderingEngine]);

  // Keyboard navigation
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = getRenderingEngine(RENDERING_ENGINE_ID) as any;
      if (!engine) return;
      const viewport = engine.getStackViewport(VIEWPORT_ID);
      if (!viewport) return;

      const imageIds = viewport.getImageIds();
      if (!imageIds.length) return;

      const current = viewport.getCurrentImageIdIndex();
      let next = current;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = Math.min(current + 1, imageIds.length - 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = Math.max(current - 1, 0);
      } else {
        return;
      }

      if (next !== current) {
        viewport.setImageIdIndex(next);
      }
    };

    element.tabIndex = 0;
    element.addEventListener("keydown", handleKeyDown);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;
    viewport.setImageIdIndex(index);
  };

  const handleResetWL = () => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;
    viewport.resetProperties();
    viewport.render();
    const voiRange = viewport.getProperties().voiRange;
    if (voiRange) {
      setWindowWidth(Math.round(voiRange.upper - voiRange.lower));
      setWindowCenter(Math.round((voiRange.upper + voiRange.lower) / 2));
    }
  };

  const hasSeries =
    selectedSeries != null && selectedSeries.instances.length > 0;
  const isSR = selectedSeries?.modality === "SR";

  // SR report view
  if (isSR && srReport) {
    return (
      <div className="h-full flex flex-col bg-gray-950">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                SR
              </span>
              <h2 className="text-lg font-semibold text-gray-100">
                Structured Report
              </h2>
            </div>

            {srReport.studyDescription && (
              <p className="text-sm text-gray-400 mb-1">
                {srReport.studyDescription}
              </p>
            )}
            {srReport.contentDate && (
              <p className="text-xs text-gray-500 mb-4">
                Date: {srReport.contentDate}
                {srReport.verificationFlag && (
                  <span className="ml-3">
                    Status: {srReport.verificationFlag}
                  </span>
                )}
              </p>
            )}

            {srReport.textBlocks.length > 0 ? (
              <div className="space-y-4">
                {srReport.textBlocks.map((block, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                  >
                    {block.conceptName && (
                      <h3 className="text-sm font-medium text-blue-400 mb-2">
                        {block.conceptName}
                      </h3>
                    )}
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {block.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No text content found in this report.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Viewport canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0 w-full"
        style={{ width: "100%", height: "100%" }}
        role="img"
        aria-label="DICOM image viewport"
      >
        {viewportError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-900/90 text-red-300 pointer-events-none">
            <div className="text-center max-w-md">
              <p className="font-medium">Error loading image</p>
              <p className="text-sm mt-2 break-words">{viewportError}</p>
            </div>
          </div>
        )}
        {!hasSeries && !viewportError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
            <div className="text-center">
              <p className="text-lg">No image loaded</p>
              <p className="text-sm mt-2">Select a series to view</p>
            </div>
          </div>
        )}

        {/* W/L overlay */}
        {hasSeries && windowWidth !== null && windowCenter !== null && (
          <div className="absolute top-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded pointer-events-none select-none">
            W: {windowWidth} L: {windowCenter}
          </div>
        )}
      </div>

      {/* Viewport controls bar */}
      <div className="h-12 bg-gray-900 border-t border-gray-700 flex items-center px-4 gap-3">
        {hasSeries && totalSlices > 1 ? (
          <>
            <span className="text-gray-400 text-xs whitespace-nowrap">
              Slice {currentSlice + 1} / {totalSlices}
            </span>
            <input
              type="range"
              min={0}
              max={totalSlices - 1}
              value={currentSlice}
              onChange={handleSliderChange}
              className="flex-1 h-1 accent-blue-500"
              aria-label="Slice navigation slider"
            />
            <button
              onClick={handleResetWL}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-600 rounded hover:border-gray-400 transition-colors"
              title="Reset window/level"
            >
              Reset W/L
            </button>
          </>
        ) : (
          <div className="text-gray-400 text-sm flex-1 text-center">
            {hasSeries ? "Single slice" : "Viewport controls"}
          </div>
        )}
      </div>
    </div>
  );
}
