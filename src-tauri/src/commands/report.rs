//! Tauri command to extract text from DICOM Structured Report (SR) files.

use std::path::Path;

use dicom_object::{open_file, InMemDicomObject};
use dicom::core::Tag;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SrReport {
    pub patient_name: Option<String>,
    pub study_description: Option<String>,
    pub completion_flag: Option<String>,
    pub verification_flag: Option<String>,
    pub content_date: Option<String>,
    pub content_time: Option<String>,
    pub text_blocks: Vec<SrTextBlock>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SrTextBlock {
    pub concept_name: Option<String>,
    pub value: String,
}

// DICOM tags for SR content
const CONTENT_SEQUENCE: Tag = Tag(0x0040, 0xA730);
const VALUE_TYPE: Tag = Tag(0x0040, 0xA040);
const TEXT_VALUE: Tag = Tag(0x0040, 0xA160);
const CONCEPT_NAME_CODE_SEQUENCE: Tag = Tag(0x0040, 0xA043);
const CODE_MEANING: Tag = Tag(0x0008, 0x0104);

/// Opens a file with the system's default application.
#[tauri::command]
pub fn open_file_external(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    open::that(path).map_err(|e| format!("Failed to open file: {}", e))
}

#[tauri::command]
pub fn read_sr_report(path: String) -> Result<SrReport, String> {
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

    let patient_name = obj
        .element_by_name("PatientName")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let study_description = obj
        .element_by_name("StudyDescription")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let completion_flag = obj
        .element_by_name("CompletionFlag")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let verification_flag = obj
        .element_by_name("VerificationFlag")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let content_date = obj
        .element_by_name("ContentDate")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let content_time = obj
        .element_by_name("ContentTime")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let mut text_blocks = Vec::new();
    extract_text_blocks(&obj, &mut text_blocks);

    Ok(SrReport {
        patient_name,
        study_description,
        completion_flag,
        verification_flag,
        content_date,
        content_time,
        text_blocks,
    })
}

/// Recursively extract text blocks from SR Content Sequence
fn extract_text_blocks<D>(obj: &InMemDicomObject<D>, blocks: &mut Vec<SrTextBlock>)
where
    D: dicom::core::dictionary::DataDictionary + Clone,
{
    let content_seq = match obj.element_opt(CONTENT_SEQUENCE).ok().flatten() {
        Some(elem) => elem,
        None => return,
    };

    let items = match content_seq.items() {
        Some(items) => items,
        None => return,
    };

    for item in items {
        // Check if this is a TEXT value type
        let value_type = item
            .element_opt(VALUE_TYPE)
            .ok()
            .flatten()
            .and_then(|e| e.to_str().ok())
            .map(|s| s.to_string());

        if value_type.as_deref() == Some("TEXT") {
            let text = item
                .element_opt(TEXT_VALUE)
                .ok()
                .flatten()
                .and_then(|e| e.to_str().ok())
                .map(|s| s.to_string());

            if let Some(text) = text {
                let concept_name = get_concept_name(item);
                blocks.push(SrTextBlock {
                    concept_name,
                    value: text,
                });
            }
        }

        // Recurse into nested content sequences
        extract_text_blocks(item, blocks);
    }
}

fn get_concept_name<D>(obj: &InMemDicomObject<D>) -> Option<String>
where
    D: dicom::core::dictionary::DataDictionary + Clone,
{
    let concept_seq = obj.element_opt(CONCEPT_NAME_CODE_SEQUENCE).ok()??;
    let items = concept_seq.items()?;
    let first = items.first()?;
    first
        .element_opt(CODE_MEANING)
        .ok()?
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string())
}
