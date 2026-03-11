use std::path::PathBuf;

use crate::dicom::{scan_directory, ScanResult};
use crate::ScannedDirs;

/// Tauri command to scan a directory for DICOM files.
/// Registers the directory in scanned dirs for protocol access.
#[tauri::command]
pub async fn scan_dicom_directory(
    path: String,
    scanned_dirs: tauri::State<'_, ScannedDirs>,
    app_handle: tauri::AppHandle,
) -> Result<ScanResult, String> {
    // Register this directory for the protocol handler
    {
        let mut dirs = scanned_dirs.0.lock().unwrap();
        dirs.insert(PathBuf::from(&path));
    }

    scan_directory(&path, Some(app_handle))
        .await
        .map_err(|e| format!("Failed to scan directory: {}", e))
}
