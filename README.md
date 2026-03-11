# Personal DICOM Viewer

A desktop DICOM medical image viewer built with Tauri v1, React, and Cornerstone3D.

## Features

- **Folder scanning** — Recursively scan directories for DICOM files, grouped by Study and Series
- **2D viewport** — Display DICOM images using Cornerstone3D StackViewport
- **Slice navigation** — Scroll through slices with mouse wheel, slider, or arrow keys
- **Window/Level** — Interactive W/L adjustment via left-click drag, with overlay display and reset
- **Metadata inspector** — Browse all DICOM tags with search/filter and click-to-copy

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v18+)
- Tauri v1 system dependencies — see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites/)

## Setup

```bash
# Install frontend dependencies
cd app && npm install && cd ..

# Run in development mode
cd src-tauri && cargo tauri dev
```

## Architecture

```
personal-dicom-viewer/
├── app/                          # React frontend (Vite)
│   └── src/
│       ├── components/           # Shared UI components (Button, Card)
│       ├── features/
│       │   ├── study-browser/    # Study/series browsing panel
│       │   ├── viewport/         # Cornerstone3D image viewport
│       │   └── metadata-inspector/  # DICOM tag inspector
│       ├── lib/                  # Tauri IPC wrappers, protocol helpers
│       └── store/                # Zustand state management
├── src-tauri/                    # Rust backend (Tauri v1)
│   └── src/
│       ├── commands/             # Tauri commands (scan, read, metadata, dialog)
│       ├── dicom/                # DICOM scanner, types
│       └── protocol.rs           # dicom-file:// custom protocol handler
└── vendor/                       # Vendored Cornerstone3D packages
```

### Data Flow

1. User selects a folder → `select_directory` Tauri command opens native picker
2. Backend scans directory → `scan_dicom_directory` walks files, parses DICOM metadata in a single pass per file
3. Frontend displays studies/series in StudyBrowser → user selects a series
4. Viewport loads images via `tauri-dicom:` custom image loader (reads raw bytes via IPC) or `dicom-file://` protocol
5. Cornerstone3D tools handle slice scrolling and W/L interaction
6. MetadataInspector fetches and displays DICOM tags for the current slice

## License

Private / Personal use.
