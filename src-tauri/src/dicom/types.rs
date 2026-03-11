use serde::{Deserialize, Serialize};

/// Represents a DICOM image instance
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DicomInstance {
    /// SOP Instance UID - unique identifier for this instance
    pub sop_instance_uid: String,
    /// Instance number (for ordering slices)
    pub instance_number: Option<i32>,
    /// Full file path on disk
    pub file_path: String,
    /// File size in bytes
    pub file_size: u64,
}

/// Represents a DICOM series (collection of instances)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DicomSeries {
    /// Series Instance UID - unique identifier for this series
    pub series_instance_uid: String,
    /// Series number
    pub series_number: Option<i32>,
    /// Series description
    pub series_description: Option<String>,
    /// Modality (CT, MR, etc.)
    pub modality: Option<String>,
    /// Number of instances in this series
    pub instance_count: usize,
    /// All instances in this series
    pub instances: Vec<DicomInstance>,
}

/// Represents a DICOM study (collection of series)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DicomStudy {
    /// Study Instance UID - unique identifier for this study
    pub study_instance_uid: String,
    /// Study description
    pub study_description: Option<String>,
    /// Study date (YYYYMMDD format)
    pub study_date: Option<String>,
    /// Patient name
    pub patient_name: Option<String>,
    /// Patient ID
    pub patient_id: Option<String>,
    /// Number of series in this study
    pub series_count: usize,
    /// All series in this study
    pub series: Vec<DicomSeries>,
    /// PDF report files found alongside DICOM images
    pub report_files: Vec<String>,
}

/// Result of a directory scan operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    /// All studies found in the directory
    pub studies: Vec<DicomStudy>,
    /// Total number of DICOM files found
    pub total_files: usize,
    /// Number of files that failed to parse
    pub failed_files: usize,
    /// Error messages for failed files (limited to first 100)
    pub errors: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dicom_instance_serializes_to_camel_case() {
        let instance = DicomInstance {
            sop_instance_uid: "1.2.3".to_string(),
            instance_number: Some(1),
            file_path: "/tmp/test.dcm".to_string(),
            file_size: 1024,
        };

        let json = serde_json::to_string(&instance).unwrap();
        assert!(json.contains("sopInstanceUid"));
        assert!(json.contains("instanceNumber"));
        assert!(json.contains("filePath"));
        assert!(json.contains("fileSize"));
        // Should NOT contain snake_case
        assert!(!json.contains("sop_instance_uid"));
    }

    #[test]
    fn scan_result_round_trip() {
        let result = ScanResult {
            studies: vec![DicomStudy {
                study_instance_uid: "1.2.3".to_string(),
                study_description: Some("Test".to_string()),
                study_date: Some("20240101".to_string()),
                patient_name: Some("Doe^John".to_string()),
                patient_id: Some("P001".to_string()),
                report_files: vec![],
                series_count: 1,
                series: vec![DicomSeries {
                    series_instance_uid: "1.2.3.4".to_string(),
                    series_number: Some(1),
                    series_description: Some("Axial".to_string()),
                    modality: Some("CT".to_string()),
                    instance_count: 1,
                    instances: vec![DicomInstance {
                        sop_instance_uid: "1.2.3.4.5".to_string(),
                        instance_number: Some(1),
                        file_path: "/tmp/test.dcm".to_string(),
                        file_size: 2048,
                    }],
                }],
            }],
            total_files: 1,
            failed_files: 0,
            errors: vec![],
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: ScanResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.studies.len(), 1);
        assert_eq!(deserialized.studies[0].series[0].instances[0].sop_instance_uid, "1.2.3.4.5");
    }
}
