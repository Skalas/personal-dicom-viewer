import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../index";
import type { DicomStudy, DicomSeries, DicomTag } from "../types";

const makeSeries = (overrides: Partial<DicomSeries> = {}): DicomSeries => ({
  seriesInstanceUid: "1.2.3.4",
  seriesNumber: 1,
  seriesDescription: "Axial",
  modality: "CT",
  instanceCount: 2,
  instances: [
    {
      sopInstanceUid: "1.2.3.4.1",
      instanceNumber: 1,
      filePath: "/tmp/1.dcm",
      fileSize: 1024,
    },
    {
      sopInstanceUid: "1.2.3.4.2",
      instanceNumber: 2,
      filePath: "/tmp/2.dcm",
      fileSize: 2048,
    },
  ],
  ...overrides,
});

const makeStudy = (overrides: Partial<DicomStudy> = {}): DicomStudy => ({
  studyInstanceUid: "1.2.3",
  studyDescription: "Test Study",
  studyDate: "20240101",
  patientName: "Doe^John",
  patientId: "P001",
  seriesCount: 1,
  series: [makeSeries()],
  reportFiles: [],
  ...overrides,
});

describe("AppStore", () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  it("starts with empty state", () => {
    const state = useAppStore.getState();
    expect(state.studies).toEqual([]);
    expect(state.selectedStudy).toBeNull();
    expect(state.selectedSeries).toBeNull();
    expect(state.viewportState).toBeNull();
    expect(state.metadata).toEqual([]);
  });

  it("setStudies updates studies list", () => {
    const studies = [makeStudy()];
    useAppStore.getState().setStudies(studies);
    expect(useAppStore.getState().studies).toEqual(studies);
  });

  it("setSelectedSeries initializes viewport state", () => {
    const series = makeSeries();
    useAppStore.getState().setSelectedSeries(series);

    const state = useAppStore.getState();
    expect(state.selectedSeries).toBe(series);
    expect(state.viewportState).not.toBeNull();
    expect(state.viewportState!.totalImages).toBe(2);
    expect(state.viewportState!.currentImageIndex).toBe(0);
  });

  it("setSelectedSeries clears metadata", () => {
    const tags: DicomTag[] = [
      { tag: "(0010,0010)", name: "PatientName", vr: "PN", value: "Doe^John" },
    ];
    useAppStore.getState().setMetadata(tags);
    expect(useAppStore.getState().metadata).toHaveLength(1);

    useAppStore.getState().setSelectedSeries(makeSeries());
    expect(useAppStore.getState().metadata).toEqual([]);
  });

  it("setSelectedStudy clears selected series", () => {
    useAppStore.getState().setSelectedSeries(makeSeries());
    expect(useAppStore.getState().selectedSeries).not.toBeNull();

    useAppStore.getState().setSelectedStudy(makeStudy());
    expect(useAppStore.getState().selectedSeries).toBeNull();
  });

  it("updateViewportState merges partial updates", () => {
    useAppStore.getState().setSelectedSeries(makeSeries());
    useAppStore.getState().updateViewportState({ currentImageIndex: 5 });

    const vp = useAppStore.getState().viewportState!;
    expect(vp.currentImageIndex).toBe(5);
    expect(vp.totalImages).toBe(2); // unchanged
  });

  it("updateViewportState does nothing when viewportState is null", () => {
    useAppStore.getState().updateViewportState({ currentImageIndex: 5 });
    expect(useAppStore.getState().viewportState).toBeNull();
  });

  it("setMetadata stores tags", () => {
    const tags: DicomTag[] = [
      { tag: "(0010,0010)", name: "PatientName", vr: "PN", value: "Doe^John" },
      { tag: "(0010,0020)", name: "PatientID", vr: "LO", value: "P001" },
    ];
    useAppStore.getState().setMetadata(tags);
    expect(useAppStore.getState().metadata).toEqual(tags);
  });

  it("resetStore returns to initial state", () => {
    useAppStore.getState().setStudies([makeStudy()]);
    useAppStore.getState().setSelectedSeries(makeSeries());
    useAppStore.getState().setMetadata([
      { tag: "(0010,0010)", name: "PatientName", vr: "PN", value: "Test" },
    ]);

    useAppStore.getState().resetStore();

    const state = useAppStore.getState();
    expect(state.studies).toEqual([]);
    expect(state.selectedSeries).toBeNull();
    expect(state.viewportState).toBeNull();
    expect(state.metadata).toEqual([]);
  });

  it("setStudiesLoadingState changes loading state", () => {
    useAppStore.getState().setStudiesLoadingState("loading");
    expect(useAppStore.getState().studiesLoadingState).toBe("loading");

    useAppStore.getState().setStudiesLoadingState("success");
    expect(useAppStore.getState().studiesLoadingState).toBe("success");
  });

  it("setStudiesError stores error info", () => {
    useAppStore
      .getState()
      .setStudiesError({ message: "Something went wrong" });
    expect(useAppStore.getState().studiesError?.message).toBe(
      "Something went wrong"
    );
  });
});
