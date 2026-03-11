//! Tauri commands for native dialogs (directory picker, etc.)

use log::warn;
use tauri::api::dialog::blocking::FileDialogBuilder;

/// Opens a native directory picker dialog.
///
/// On macOS the native dialog must run on the main thread; Tauri's blocking API
/// is intended for use from async commands (off main thread). If the dialog
/// fails (e.g. "must run on main thread"), the error is returned to the frontend.
///
/// # Returns
/// * `Option<String>` - The selected directory path, or None if cancelled
#[tauri::command]
pub async fn select_directory() -> Result<Option<String>, String> {
    // Run the blocking dialog on a thread-pool thread so we don't block the async runtime.
    // On some platforms native dialogs may require the main thread; if that fails we surface the error.
    let path = tokio::task::spawn_blocking(|| {
        FileDialogBuilder::new().pick_folder()
    })
    .await
    .map_err(|e| {
        warn!("select_directory spawn_blocking join error: {}", e);
        format!("Dialog failed: {}", e)
    })?;

    Ok(path.map(|p| p.to_string_lossy().into_owned()))
}
