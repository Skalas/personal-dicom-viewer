//! Tauri command to extract DICOM metadata tags from a file.

use std::path::Path;

use dicom::core::header::{HasLength, Header};
use dicom::core::dictionary::DataDictionary;
use dicom_dictionary_std::StandardDataDictionary;
use dicom_object::open_file;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DicomTag {
    pub tag: String,
    pub name: String,
    pub vr: String,
    pub value: String,
}

const MAX_VALUE_LENGTH: usize = 256;

#[tauri::command]
pub fn get_dicom_metadata(path: String) -> Result<Vec<DicomTag>, String> {
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

    let obj = open_file(path).map_err(|e| format!("Failed to open DICOM file: {}", e))?;
    let dict = StandardDataDictionary;

    let mut tags: Vec<DicomTag> = Vec::new();

    for element in obj.into_iter() {
        let element_tag = element.header().tag();
        let tag_str = format!("({:04X},{:04X})", element_tag.group(), element_tag.element());

        let name = dict
            .by_tag(element_tag)
            .map(|entry| entry.alias.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let vr = element.header().vr.to_string();

        // Skip pixel data values (too large), show placeholder
        let value = if element_tag == dicom::core::Tag(0x7FE0, 0x0010) {
            "<Pixel Data>".to_string()
        } else {
            let raw = element.to_str().map(|s| s.to_string()).unwrap_or_else(|_| {
                format!("<{} bytes>", element.header().length().get().unwrap_or(0))
            });
            if raw.len() > MAX_VALUE_LENGTH {
                format!("{}...", &raw[..MAX_VALUE_LENGTH])
            } else {
                raw
            }
        };

        tags.push(DicomTag {
            tag: tag_str,
            name,
            vr: vr.to_string(),
            value,
        });
    }

    Ok(tags)
}
