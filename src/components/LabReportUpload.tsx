import { useRef, useState } from "react";
import type { LabReadings, SampleResult } from "../types";
import { extractTextFromPdf, parseLabReadingsFromText } from "../lib/pdfExtract";
import { AlertIcon, FileTextIcon, LoaderIcon, SparklesIcon, UploadIcon } from "./icons";

export interface LabReportExtraction {
  fileName: string;
  readings: Partial<LabReadings>;
  labReportNumber?: string;
  sampleDate?: string;
  suggestedResult: SampleResult | null;
  suggestedReason?: string;
  fieldsFoundCount: number;
  fieldsTotal: number;
}

/**
 * Drop-in PDF upload control. Parsing happens fully in the browser — the
 * file itself is never stored or sent anywhere, only the recognized
 * readings are handed back to the caller for the technician to review.
 */
export function LabReportUpload({
  onExtracted,
  compact = false,
}: {
  onExtracted: (result: LabReportExtraction) => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState("loading");
    setMessage(null);
    setFileName(file.name);
    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseLabReadingsFromText(text);
      if (parsed.fieldsFoundCount === 0 && !parsed.labReportNumber) {
        setState("error");
        setMessage(
          "Couldn't recognize any readings in this PDF. You can still enter them manually below."
        );
        return;
      }
      setState("done");
      setMessage(
        `Extracted ${parsed.fieldsFoundCount} of 8 readings from "${file.name}". Review the values below before saving.`
      );
      onExtracted({
        fileName: file.name,
        readings: parsed.readings,
        labReportNumber: parsed.labReportNumber,
        sampleDate: parsed.sampleDate,
        suggestedResult: parsed.suggestedResult,
        suggestedReason: parsed.suggestedReason,
        fieldsFoundCount: parsed.fieldsFoundCount,
        fieldsTotal: parsed.fields.length,
      });
    } catch (err) {
      console.error("PDF extraction failed", err);
      setState("error");
      setMessage(
        "Couldn't read that PDF. It may be scanned/image-only or corrupted — you can enter readings manually below."
      );
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "loading"}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 transition ${
          compact ? "py-2.5 text-xs" : "py-3.5 text-sm"
        } ${
          state === "loading"
            ? "cursor-wait border-oil-300 bg-oil-50 text-oil-600"
            : "border-slate-300 bg-slate-50 text-slate-500 hover:border-oil-400 hover:bg-oil-50/50 hover:text-oil-700"
        }`}
      >
        {state === "loading" ? (
          <>
            <LoaderIcon className="h-4 w-4 animate-spin" />
            Reading {fileName}…
          </>
        ) : (
          <>
            <UploadIcon className="h-4 w-4" />
            Upload lab report (PDF) to auto-fill readings
          </>
        )}
      </button>

      {message && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
            state === "error"
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {state === "error" ? (
            <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {state === "done" && fileName && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <FileTextIcon className="h-3 w-3" />
          {fileName} (parsed locally — not stored)
        </div>
      )}
    </div>
  );
}
