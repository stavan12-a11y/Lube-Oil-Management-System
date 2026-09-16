import { describe, expect, it } from "vitest";
import { parseLabReadingsFromText } from "../src/lib/pdfExtract";

describe("parseLabReadingsFromText", () => {
  it("extracts all fields from a well-labeled report", () => {
    const text = `
      Insight Labs — Oil Analysis Report
      Report No: LAB-2026-0412
      Date Sampled: 2026-03-01
      Viscosity @ 40°C (cSt): 31.8
      Viscosity @ 100°C (cSt): 5.4
      Viscosity Index: 102
      Water Content (ppm): 68
      TAN (mg KOH/g): 0.12
      ISO 4406 Cleanliness Code: 16/14/11
      Iron (Fe) ppm: 8
      Flash Point (°C): 214
    `;
    const result = parseLabReadingsFromText(text);

    expect(result.readings.viscosity40).toBe("31.8");
    expect(result.readings.viscosity100).toBe("5.4");
    expect(result.readings.viscosityIndex).toBe("102");
    expect(result.readings.waterPpm).toBe("68");
    expect(result.readings.tan).toBe("0.12");
    expect(result.readings.isoCleanliness).toBe("16/14/11");
    expect(result.readings.ferrousWearPpm).toBe("8");
    expect(result.readings.flashPointC).toBe("214");
    expect(result.labReportNumber).toBe("LAB-2026-0412");
    expect(result.sampleDate).toBe("2026-03-01");
    expect(result.fieldsFoundCount).toBe(8);
    expect(result.suggestedResult).toBe("normal");
  });

  it("recognizes alternate label wording used by other labs", () => {
    const text = `
      Sample ID: WC-88213
      KV40: 45.6 cSt
      KV100: 7.9 cSt
      Moisture (Karl Fischer): 120 ppm
      Total Acid Number: 0.2
    `;
    const result = parseLabReadingsFromText(text);

    expect(result.readings.viscosity40).toBe("45.6");
    expect(result.readings.viscosity100).toBe("7.9");
    expect(result.readings.waterPpm).toBe("120");
    expect(result.readings.tan).toBe("0.2");
    expect(result.labReportNumber).toBe("WC-88213");
  });

  it("suggests an abnormal outcome when readings exceed common alarm thresholds", () => {
    const text = `
      Viscosity @ 40°C: 225
      Water Content (ppm): 610
      Iron (Fe) ppm: 142
      TAN: 0.42
    `;
    const result = parseLabReadingsFromText(text);

    expect(result.suggestedResult).toBe("abnormal");
    expect(result.suggestedReason).toMatch(/water/i);
  });

  it("returns no matches for unrecognized text", () => {
    const result = parseLabReadingsFromText("This is just a cover letter.");
    expect(result.fieldsFoundCount).toBe(0);
    expect(result.labReportNumber).toBeUndefined();
    expect(result.suggestedResult).toBeNull();
  });
});
