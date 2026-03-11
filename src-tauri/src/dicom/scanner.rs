use std::collections::HashMap;
use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use dicom_object::open_file;
use log::{debug, warn};
use serde::Serialize;
use walkdir::WalkDir;

use super::types::{DicomInstance, DicomSeries, DicomStudy, ScanResult};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanProgress {
    scanned: usize,
    found: usize,
}

const PROGRESS_INTERVAL: usize = 50;

/// Maximum number of error messages to keep
const MAX_ERROR_MESSAGES: usize = 100;

/// Modalities that are not displayable images
const NON_IMAGE_MODALITIES: &[&str] = &[
    "PR", "KO", "AU", "DOC", "PLAN", "REG", "FID",
    "RTPLAN", "RTSTRUCT", "RTDOSE", "RWV",
];

/// All metadata extracted from a single DICOM file parse
struct ParsedDicomFile {
    study_uid: String,
    series_uid: String,
    instance: DicomInstance,
    // Study-level metadata
    study_description: Option<String>,
    study_date: Option<String>,
    patient_name: Option<String>,
    patient_id: Option<String>,
    // Series-level metadata
    series_number: Option<i32>,
    series_description: Option<String>,
    modality: Option<String>,
}

/// Scans a directory recursively for DICOM files and groups them by study and series.
/// Optionally emits `scan-progress` events via the Tauri app handle.
pub async fn scan_directory<P: AsRef<Path>>(
    path: P,
    app_handle: Option<tauri::AppHandle>,
) -> Result<ScanResult> {
    let path = path.as_ref();

    if !path.exists() {
        anyhow::bail!("Path does not exist: {}", path.display());
    }

    if !path.is_dir() {
        anyhow::bail!("Path is not a directory: {}", path.display());
    }

    let path_buf = path.to_path_buf();

    tokio::task::spawn_blocking(move || scan_directory_blocking(&path_buf, app_handle.as_ref()))
        .await
        .context("Failed to execute directory scan task")?
}

/// Blocking implementation of directory scanning
fn scan_directory_blocking(path: &Path, app_handle: Option<&tauri::AppHandle>) -> Result<ScanResult> {
    let mut studies_map: HashMap<String, StudyBuilder> = HashMap::new();
    let mut total_files = 0;
    let mut dicom_found = 0;
    let mut failed_files = 0;
    let mut errors = Vec::new();
    let mut pdf_files: Vec<String> = Vec::new();

    debug!("Starting directory scan: {}", path.display());

    for entry in WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        // Collect PDF files only from the top-level scan directory (doctor reports)
        if let Some(ext) = entry_path.extension() {
            if ext.eq_ignore_ascii_case("pdf") {
                if entry_path.parent() == Some(path) {
                    pdf_files.push(entry_path.to_string_lossy().to_string());
                }
                continue;
            }
        }

        total_files += 1;

        match parse_dicom_file(entry_path) {
            Ok(Some(parsed)) => {
                dicom_found += 1;
                let study_builder = studies_map
                    .entry(parsed.study_uid.clone())
                    .or_insert_with(|| StudyBuilder::new(parsed.study_uid.clone()));

                study_builder.add_instance(parsed);
            }
            Ok(None) => {
                debug!("Skipping non-DICOM file: {}", entry_path.display());
            }
            Err(e) => {
                failed_files += 1;
                if errors.len() < MAX_ERROR_MESSAGES {
                    errors.push(format!("{}: {}", entry_path.display(), e));
                }
                warn!("Failed to parse {}: {}", entry_path.display(), e);
            }
        }

        // Emit progress every PROGRESS_INTERVAL files
        if total_files % PROGRESS_INTERVAL == 0 {
            if let Some(handle) = app_handle {
                use tauri::Manager;
                let _ = handle.emit_all(
                    "scan-progress",
                    ScanProgress {
                        scanned: total_files,
                        found: dicom_found,
                    },
                );
            }
        }
    }

    debug!(
        "Scan complete: {} files processed, {} failed, {} studies found",
        total_files,
        failed_files,
        studies_map.len()
    );

    // Sort PDFs for consistent display
    pdf_files.sort();

    let studies: Vec<DicomStudy> = studies_map
        .into_iter()
        .map(|(_, builder)| builder.build(&pdf_files))
        .collect();

    Ok(ScanResult {
        studies,
        total_files,
        failed_files,
        errors,
    })
}

/// Parses a DICOM file and extracts all metadata in a single pass.
///
/// Returns Ok(None) if the file is not a DICOM file.
fn parse_dicom_file(path: &Path) -> Result<Option<ParsedDicomFile>> {
    let dicom_obj = match open_file(path) {
        Ok(obj) => obj,
        Err(_) => {
            return Ok(None);
        }
    };

    // Required UIDs
    let study_uid = dicom_obj
        .element_by_name("StudyInstanceUID")
        .context("Missing StudyInstanceUID")?
        .to_str()
        .context("Invalid StudyInstanceUID")?
        .to_string();

    let series_uid = dicom_obj
        .element_by_name("SeriesInstanceUID")
        .context("Missing SeriesInstanceUID")?
        .to_str()
        .context("Invalid SeriesInstanceUID")?
        .to_string();

    let sop_instance_uid = dicom_obj
        .element_by_name("SOPInstanceUID")
        .context("Missing SOPInstanceUID")?
        .to_str()
        .context("Invalid SOPInstanceUID")?
        .to_string();

    // Extract modality early to skip non-image files
    let modality = dicom_obj
        .element_by_name("Modality")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.trim().to_string());

    if let Some(ref m) = modality {
        if NON_IMAGE_MODALITIES.iter().any(|&non_img| m.eq_ignore_ascii_case(non_img)) {
            return Ok(None);
        }
    }

    // Optional instance-level
    let instance_number = dicom_obj
        .element_by_name("InstanceNumber")
        .ok()
        .and_then(|e| e.to_int::<i32>().ok());

    let file_size = fs::metadata(path)
        .context("Failed to get file metadata")?
        .len();

    // Optional study-level metadata
    let study_description = dicom_obj
        .element_by_name("StudyDescription")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let study_date = dicom_obj
        .element_by_name("StudyDate")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let patient_name = dicom_obj
        .element_by_name("PatientName")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let patient_id = dicom_obj
        .element_by_name("PatientID")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    // Optional series-level metadata
    let series_number = dicom_obj
        .element_by_name("SeriesNumber")
        .ok()
        .and_then(|e| e.to_int::<i32>().ok());

    let series_description = dicom_obj
        .element_by_name("SeriesDescription")
        .ok()
        .and_then(|e| e.to_str().ok())
        .map(|s| s.to_string());

    let instance = DicomInstance {
        sop_instance_uid,
        instance_number,
        file_path: path.to_string_lossy().to_string(),
        file_size,
    };

    Ok(Some(ParsedDicomFile {
        study_uid,
        series_uid,
        instance,
        study_description,
        study_date,
        patient_name,
        patient_id,
        series_number,
        series_description,
        modality,
    }))
}

/// Helper struct to build a study incrementally
struct StudyBuilder {
    study_instance_uid: String,
    study_description: Option<String>,
    study_date: Option<String>,
    patient_name: Option<String>,
    patient_id: Option<String>,
    series_map: HashMap<String, SeriesBuilder>,
}

impl StudyBuilder {
    fn new(study_instance_uid: String) -> Self {
        Self {
            study_instance_uid,
            study_description: None,
            study_date: None,
            patient_name: None,
            patient_id: None,
            series_map: HashMap::new(),
        }
    }

    fn add_instance(&mut self, parsed: ParsedDicomFile) {
        // Set study-level metadata from the first instance that has it
        if self.study_description.is_none() {
            self.study_description = parsed.study_description;
            self.study_date = parsed.study_date;
            self.patient_name = parsed.patient_name;
            self.patient_id = parsed.patient_id;
        }

        let series_builder = self
            .series_map
            .entry(parsed.series_uid.clone())
            .or_insert_with(|| SeriesBuilder {
                series_instance_uid: parsed.series_uid,
                series_number: parsed.series_number,
                series_description: parsed.series_description,
                modality: parsed.modality,
                instances: Vec::new(),
            });

        series_builder.instances.push(parsed.instance);
    }

    fn build(self, pdf_files: &[String]) -> DicomStudy {
        let mut series: Vec<DicomSeries> = self
            .series_map
            .into_iter()
            .map(|(_, builder)| builder.build())
            .collect();

        series.sort_by(|a, b| {
            a.series_number
                .unwrap_or(i32::MAX)
                .cmp(&b.series_number.unwrap_or(i32::MAX))
        });

        DicomStudy {
            study_instance_uid: self.study_instance_uid,
            study_description: self.study_description,
            study_date: self.study_date,
            patient_name: self.patient_name,
            patient_id: self.patient_id,
            series_count: series.len(),
            series,
            report_files: pdf_files.to_vec(),
        }
    }
}

/// Helper struct to build a series incrementally
struct SeriesBuilder {
    series_instance_uid: String,
    series_number: Option<i32>,
    series_description: Option<String>,
    modality: Option<String>,
    instances: Vec<DicomInstance>,
}

impl SeriesBuilder {
    fn build(mut self) -> DicomSeries {
        self.instances.sort_by(|a, b| {
            a.instance_number
                .unwrap_or(i32::MAX)
                .cmp(&b.instance_number.unwrap_or(i32::MAX))
        });

        DicomSeries {
            series_instance_uid: self.series_instance_uid,
            series_number: self.series_number,
            series_description: self.series_description,
            modality: self.modality,
            instance_count: self.instances.len(),
            instances: self.instances,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parse_non_dicom_file_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("not_dicom.txt");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(b"This is not a DICOM file").unwrap();

        let result = parse_dicom_file(&file_path).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn parse_empty_file_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("empty.dcm");
        fs::File::create(&file_path).unwrap();

        let result = parse_dicom_file(&file_path).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn scan_nonexistent_directory_returns_error() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(scan_directory("/nonexistent/path/12345", None));
        assert!(result.is_err());
    }

    #[test]
    fn scan_empty_directory_returns_empty_results() {
        let dir = tempfile::tempdir().unwrap();
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(scan_directory(dir.path(), None)).unwrap();
        assert!(result.studies.is_empty());
        assert_eq!(result.total_files, 0);
        assert_eq!(result.failed_files, 0);
    }

    #[test]
    fn scan_directory_with_non_dicom_files_skips_them() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        let mut f = fs::File::create(file_path).unwrap();
        f.write_all(b"not a dicom file").unwrap();

        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(scan_directory(dir.path(), None)).unwrap();
        assert!(result.studies.is_empty());
        assert_eq!(result.total_files, 1);
        assert_eq!(result.failed_files, 0);
    }

    #[test]
    fn study_builder_populates_metadata_from_first_instance() {
        let mut builder = StudyBuilder::new("study-1".to_string());

        let parsed = ParsedDicomFile {
            study_uid: "study-1".to_string(),
            series_uid: "series-1".to_string(),
            instance: DicomInstance {
                sop_instance_uid: "sop-1".to_string(),
                instance_number: Some(1),
                file_path: "/tmp/test.dcm".to_string(),
                file_size: 100,
            },
            study_description: Some("Test Study".to_string()),
            study_date: Some("20240101".to_string()),
            patient_name: Some("Doe^John".to_string()),
            patient_id: Some("P001".to_string()),
            series_number: Some(1),
            series_description: Some("Axial".to_string()),
            modality: Some("CT".to_string()),
        };

        builder.add_instance(parsed);

        let study = builder.build(&[]);
        assert_eq!(study.study_instance_uid, "study-1");
        assert_eq!(study.study_description.as_deref(), Some("Test Study"));
        assert_eq!(study.patient_name.as_deref(), Some("Doe^John"));
        assert_eq!(study.series_count, 1);
        assert_eq!(study.series[0].instance_count, 1);
        assert_eq!(study.series[0].modality.as_deref(), Some("CT"));
    }

    #[test]
    fn series_builder_sorts_instances_by_number() {
        let builder = SeriesBuilder {
            series_instance_uid: "series-1".to_string(),
            series_number: Some(1),
            series_description: None,
            modality: None,
            instances: vec![
                DicomInstance {
                    sop_instance_uid: "sop-3".to_string(),
                    instance_number: Some(3),
                    file_path: "/tmp/3.dcm".to_string(),
                    file_size: 100,
                },
                DicomInstance {
                    sop_instance_uid: "sop-1".to_string(),
                    instance_number: Some(1),
                    file_path: "/tmp/1.dcm".to_string(),
                    file_size: 100,
                },
                DicomInstance {
                    sop_instance_uid: "sop-2".to_string(),
                    instance_number: Some(2),
                    file_path: "/tmp/2.dcm".to_string(),
                    file_size: 100,
                },
            ],
        };

        let series = builder.build();
        assert_eq!(series.instances[0].instance_number, Some(1));
        assert_eq!(series.instances[1].instance_number, Some(2));
        assert_eq!(series.instances[2].instance_number, Some(3));
    }
}
