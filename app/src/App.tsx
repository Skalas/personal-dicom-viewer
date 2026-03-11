import { lazy, Suspense } from "react";
import { StudyBrowser } from "./features/study-browser";
import { MetadataInspector } from "./features/metadata-inspector";

const Viewport = lazy(() =>
  import("./features/viewport").then((m) => ({ default: m.Viewport }))
);

/**
 * Main application component
 *
 * Layout structure:
 * - Left sidebar: Study Browser (25%)
 * - Center: Viewport (50%)
 * - Right sidebar: Metadata Inspector (25%)
 */
function App() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-900">
      {/* Study Browser - Left Panel */}
      <aside className="w-80 border-r border-gray-700 flex-shrink-0">
        <StudyBrowser />
      </aside>

      {/* Main Viewport - Center (lazy: Cornerstone loads only when this chunk runs) */}
      <main className="flex-1 min-w-0">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center bg-black text-gray-500">
              <span>Loading viewport…</span>
            </div>
          }
        >
          <Viewport />
        </Suspense>
      </main>

      {/* Metadata Inspector - Right Panel */}
      <aside className="w-80 border-l border-gray-700 flex-shrink-0">
        <MetadataInspector />
      </aside>
    </div>
  );
}

export default App;
