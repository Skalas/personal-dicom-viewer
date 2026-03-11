use std::fs;
use std::path::PathBuf;

use log::{debug, error};
use tauri::http::{Request, Response, ResponseBuilder};

use crate::ScannedDirs;

/// Custom protocol handler for dicom-file:// URLs
///
/// Serves DICOM files from disk. Only allows files under previously scanned directories.
pub fn dicom_file_protocol_handler(
    request: &Request,
    scanned_dirs: &ScannedDirs,
) -> Result<Response, Box<dyn std::error::Error>> {
    let uri = request.uri();

    let path_str = uri.strip_prefix("dicom-file://").unwrap_or(uri);

    debug!("DICOM file protocol request: {}", path_str);

    let decoded_path = percent_encoding::percent_decode_str(path_str)
        .decode_utf8()
        .map_err(|e| format!("Invalid UTF-8 in path: {}", e))?
        .to_string();

    let file_path = PathBuf::from(&decoded_path);

    // Security: require absolute path
    if !file_path.is_absolute() {
        error!("Rejected non-absolute path: {}", decoded_path);
        return ResponseBuilder::new()
            .status(400)
            .body("Only absolute paths are allowed".as_bytes().to_vec())
            .map_err(Into::into);
    }

    // Security: only serve files under scanned directories
    {
        let dirs = scanned_dirs.0.lock().unwrap();
        let allowed = dirs.iter().any(|dir| file_path.starts_with(dir));
        if !allowed {
            error!(
                "Rejected path outside scanned directories: {}",
                file_path.display()
            );
            return ResponseBuilder::new()
                .status(403)
                .body("Access denied: path is outside scanned directories".as_bytes().to_vec())
                .map_err(Into::into);
        }
    }

    if !file_path.exists() {
        error!("File not found: {}", file_path.display());
        return ResponseBuilder::new()
            .status(404)
            .body(
                format!("File not found: {}", file_path.display())
                    .as_bytes()
                    .to_vec(),
            )
            .map_err(Into::into);
    }

    if !file_path.is_file() {
        error!("Path is not a file: {}", file_path.display());
        return ResponseBuilder::new()
            .status(400)
            .body("Path is not a file".as_bytes().to_vec())
            .map_err(Into::into);
    }

    match fs::read(&file_path) {
        Ok(data) => {
            debug!(
                "Successfully read file: {} ({} bytes)",
                file_path.display(),
                data.len()
            );

            let mime_type =
                if file_path.extension().and_then(|s| s.to_str()) == Some("dcm")
                    || is_likely_dicom(&data)
                {
                    "application/dicom"
                } else {
                    "application/octet-stream"
                };

            ResponseBuilder::new()
                .status(200)
                .header("Content-Type", mime_type)
                .header("Content-Length", data.len().to_string())
                .header("Access-Control-Allow-Origin", "*")
                .body(data)
                .map_err(Into::into)
        }
        Err(e) => {
            error!("Failed to read file {}: {}", file_path.display(), e);
            ResponseBuilder::new()
                .status(500)
                .body(
                    format!("Failed to read file: {}", e)
                        .as_bytes()
                        .to_vec(),
                )
                .map_err(Into::into)
        }
    }
}

/// Check if the file data looks like a DICOM file
fn is_likely_dicom(data: &[u8]) -> bool {
    if data.len() < 132 {
        return false;
    }
    &data[128..132] == b"DICM"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_likely_dicom() {
        let mut buffer = vec![0u8; 132];
        buffer[128..132].copy_from_slice(b"DICM");
        assert!(is_likely_dicom(&buffer));

        let non_dicom = vec![0u8; 132];
        assert!(!is_likely_dicom(&non_dicom));

        let too_short = vec![0u8; 100];
        assert!(!is_likely_dicom(&too_short));
    }
}
