//! Tauri command to read DICOM file bytes for the frontend image loader.
//! Used when the webview's XHR cannot load custom protocol URLs (dicom-file://).

use std::fs;
use std::path::Path;

/// Reads a DICOM file from disk and returns its contents as base64.
/// Tauri v1 lacks efficient binary IPC, so base64 encoding avoids the
/// enormous JSON number[] that Vec<u8> would produce via serde_json.
#[tauri::command]
pub fn read_dicom_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", path.display()));
    }
    if !path.is_absolute() {
        return Err("Only absolute paths are allowed".to_string());
    }

    let data = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    Ok(BASE64.encode(&data))
}
