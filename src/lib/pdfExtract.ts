import type { LabReadings, SampleResult } from "../types";

/**
 * Extracts raw text from a PDF file entirely in the browser using pdf.js.
 * The PDF is never uploaded anywhere — parsing happens locally, and only the
 * handful of numeric readings we manage to recognize are kept.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url"))
    .default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) =>
      "str" in item ? item.str : ""
    );
    pageTexts.push(strings.join(" "));
  }
  await pdf.destroy();
  return pageTexts.join("\n");
}

export interface ExtractedLabField {
  key: keyof LabReadings;
  found: boolean;
}

export interface ExtractedLabData {
  readings: Partial<LabReadings>;
  labReportNumber?: string;
  /** yyyy-mm-dd, if a sample/report date could be recognized in the text. */
  sampleDate?: string;
  /** Best-effort guess based on common alarm thresholds — always let the tech confirm. */
  suggestedResult: SampleResult | null;
  suggestedReason?: string;
  fields: ExtractedLabField[];
  fieldsFoundCount: number;
}

/** First capturing-group match for a set of label patterns. */
function matchGroup(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m && m[1] !== undefined) {
      return m[1].trim();
    }
  }
  return undefined;
}

const NUM = "(-?\\d+(?:\\.\\d+)?)";
const GAP = "[:\\s]{0,3}";
const FILL = "[^0-9\\n-]{0,20}";

const FIELD_PATTERNS: Record<keyof LabReadings, RegExp[]> = {
  viscosity40: [
    new RegExp(
      `(?:kinematic\\s+)?visc(?:osity)?\\s*(?:@|at)?\\s*40\\s*°?\\s*c${FILL}${NUM}`,
      "i"
    ),
    new RegExp(`\\bKV\\s*(?:@|at)?\\s*40\\b${FILL}${NUM}`, "i"),
    new RegExp(`\\bV40\\b${GAP}${NUM}`, "i"),
  ],
  viscosity100: [
    new RegExp(
      `(?:kinematic\\s+)?visc(?:osity)?\\s*(?:@|at)?\\s*100\\s*°?\\s*c${FILL}${NUM}`,
      "i"
    ),
    new RegExp(`\\bKV\\s*(?:@|at)?\\s*100\\b${FILL}${NUM}`, "i"),
    new RegExp(`\\bV100\\b${GAP}${NUM}`, "i"),
  ],
  viscosityIndex: [
    new RegExp(`visc(?:osity)?\\s*index${FILL}${NUM}`, "i"),
    new RegExp(`\\bV\\.?\\s*I\\.?\\b${GAP}${NUM}`, "i"),
  ],
  waterPpm: [
    new RegExp(
      `\\b(?:water(?:\\s*content)?|moisture|karl\\s*fischer|h2o)\\b${FILL}${NUM}`,
      "i"
    ),
  ],
  tan: [
    new RegExp(
      `(?:total\\s+acid\\s+number|acid\\s+number|\\bTAN\\b)${FILL}${NUM}`,
      "i"
    ),
  ],
  isoCleanliness: [
    /ISO\s*4406[^0-9]{0,15}(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2})/i,
    /cleanliness\s*code[^0-9]{0,15}(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2})/i,
  ],
  ferrousWearPpm: [
    new RegExp(`\\b(?:iron|ferrous(?:\\s+wear)?|Fe)\\b${FILL}${NUM}`, "i"),
  ],
  flashPointC: [new RegExp(`flash\\s*point${FILL}${NUM}`, "i")],
};

const REPORT_NUMBER_PATTERNS = [
  /(?:lab\s*)?report\s*(?:no\.?|number|#)\s*[:-]?\s*([A-Z0-9][A-Z0-9/-]{3,})/i,
  /sample\s*id\s*[:-]?\s*([A-Z0-9][A-Z0-9/-]{3,})/i,
];

const DATE_LABEL_PATTERNS = [
  /(?:date\s*sampled|sample\s*date|date\s*drawn|date\s*taken)\s*[:-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i,
];

function normalizeDate(raw: string): string | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;

  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw);
  if (slash) {
    const [, a, b, rawYear] = slash;
    const y = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    // Assume US-style month/day when the first part could plausibly be a month.
    const month = Number(a) <= 12 ? a : b;
    const day = Number(a) <= 12 ? b : a;
    return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return undefined;
}

/** Best-effort, advisory-only suggestion — the technician always confirms the outcome. */
function suggestResult(readings: Partial<LabReadings>): {
  result: SampleResult | null;
  reason?: string;
} {
  const water = Number(readings.waterPpm);
  if (Number.isFinite(water) && water > 500) {
    return { result: "abnormal", reason: `elevated water content (${water} ppm)` };
  }
  const fe = Number(readings.ferrousWearPpm);
  if (Number.isFinite(fe) && fe > 100) {
    return { result: "abnormal", reason: `elevated ferrous wear metal (${fe} ppm)` };
  }
  const tan = Number(readings.tan);
  if (Number.isFinite(tan) && tan > 1.0) {
    return { result: "abnormal", reason: `high TAN (${tan} mg KOH/g)` };
  }
  const isoMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{1,2})$/.exec(
    readings.isoCleanliness ?? ""
  );
  if (isoMatch && Number(isoMatch[1]) > 21) {
    return {
      result: "abnormal",
      reason: `poor ISO 4406 cleanliness (${readings.isoCleanliness})`,
    };
  }
  const fieldsWithValue = Object.values(readings).filter((v) => v && v.trim()).length;
  if (fieldsWithValue >= 3) return { result: "normal" };
  return { result: null };
}

/** Parse a block of extracted lab-report text for known readings and metadata. */
export function parseLabReadingsFromText(text: string): ExtractedLabData {
  const normalized = text.replace(/\r/g, "");
  const readings: Partial<LabReadings> = {};
  const fields: ExtractedLabField[] = [];

  for (const key of Object.keys(FIELD_PATTERNS) as (keyof LabReadings)[]) {
    let value = matchGroup(normalized, FIELD_PATTERNS[key]);
    if (value !== undefined) {
      if (key === "isoCleanliness") value = value.replace(/\s+/g, "");
      readings[key] = value;
      fields.push({ key, found: true });
    } else {
      fields.push({ key, found: false });
    }
  }

  const labReportNumber = matchGroup(normalized, REPORT_NUMBER_PATTERNS);
  const rawDate = matchGroup(normalized, DATE_LABEL_PATTERNS);
  const sampleDate = rawDate ? normalizeDate(rawDate) : undefined;

  const suggestion = suggestResult(readings);

  return {
    readings,
    labReportNumber,
    sampleDate,
    suggestedResult: suggestion.result,
    suggestedReason: suggestion.reason,
    fields,
    fieldsFoundCount: fields.filter((f) => f.found).length,
  };
}
