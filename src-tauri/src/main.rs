// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod dicom;
mod protocol;

use log::info;
use tauri::Manager;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

/// Managed state tracking which directories have been scanned.
/// The dicom-file:// protocol handler rejects requests for files outside these directories.
pub struct ScannedDirs(pub Mutex<HashSet<PathBuf>>);

fn main() {
    // Initialize logger
    env_logger::init();

    info!("Starting DICOM Viewer application");

    tauri::Builder::default()
        .manage(ScannedDirs(Mutex::new(HashSet::new())))
        .invoke_handler(tauri::generate_handler![
            commands::select_directory,
            commands::scan_dicom_directory,
            commands::read_dicom_file,
            commands::get_dicom_metadata,
            commands::read_sr_report,
            commands::open_file_external,
        ])
        .register_uri_scheme_protocol("dicom-file", |app, request| {
            let scanned = app.state::<ScannedDirs>();
            protocol::dicom_file_protocol_handler(request, &scanned)
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
