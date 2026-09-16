import { useState } from "react";
import type { Equipment, LabReadings, SampleResult } from "../types";
import { useLubeOil } from "../store";
import { formatDate, formatDuration, todayDate } from "../lib/helpers";
import { getMostRecentHistory, sampleDurationMs } from "../lib/derive";
import { LabReportUpload, type LabReportExtraction } from "./LabReportUpload";
import {
  ActiveActionFlow,
  LabReadingsFields,
  READING_FIELDS,
  SampleMeta,
} from "./SampleEditing";
import { CheckIcon, ClockIcon, PlusIcon, RefreshIcon, SparklesIcon } from "./icons";

function LastSampleSummary({ equipment }: { equipment: Equipment }) {
  const last = getMostRecentHistory(equipment);
  if (!last) return null;

  if (last.result === "normal") {
    const durationMs = sampleDurationMs(last);
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckIcon className="h-4 w-4" />
          Last sample was normal &amp; filed
        </div>
        <p className="mt-1 text-xs text-emerald-700">
          Completed {formatDate(last.date)}
          {durationMs !== null && last.completedAt && (
            <>
              {" "}
              in <strong>{formatDuration(last.startedAt, last.completedAt)}</strong>
            </>
          )}{" "}
          and archived to history. Draw a new sample below when it's due again.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
        <RefreshIcon className="h-4 w-4" />
        Re-sample recommended
      </div>
      <p className="mt-1 text-xs text-amber-700">
        The last round was abnormal on {formatDate(last.date)} and was resolved
        after corrective action. Draw a confirmation sample below.
      </p>
    </div>
  );
}

function StartSampleForm({ equipment }: { equipment: Equipment }) {
  const { startSample } = useLubeOil();
  const [date, setDate] = useState(todayDate());
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<SampleResult | null>(null);
  const [labReportNumber, setLabReportNumber] = useState("");
  const [readings, setReadings] = useState<Partial<LabReadings>>({});
  const [labReportFileName, setLabReportFileName] = useState<string>();
  const [suggestion, setSuggestion] = useState<LabReportExtraction | null>(null);

  const hasReadings = Object.values(readings).some((v) => v && v.trim());

  function handleExtracted(extraction: LabReportExtraction) {
    setReadings((prev) => ({ ...prev, ...extraction.readings }));
    if (extraction.labReportNumber) setLabReportNumber(extraction.labReportNumber);
    if (extraction.sampleDate) setDate(extraction.sampleDate);
    setLabReportFileName(extraction.fileName);
    setSuggestion(extraction);
    if (extraction.suggestedResult) setResult(extraction.suggestedResult);
  }

  function submit() {
    startSample(equipment.id, {
      date,
      notes,
      result,
      labReportNumber,
      labReportFileName,
      readings,
    });
    setDate(todayDate());
    setNotes("");
    setResult(null);
    setLabReportNumber("");
    setReadings({});
    setLabReportFileName(undefined);
    setSuggestion(null);
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <h4 className="text-sm font-semibold text-slate-800">
        Record a new oil sample
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Upload the lab's PDF report to auto-fill readings, or enter them
        manually if the report isn't ready yet.
      </p>

      <div className="mt-4">
        <LabReportUpload onExtracted={handleExtracted} />
      </div>

      {suggestion && suggestion.suggestedResult && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-oil-50 px-3 py-2 text-xs text-oil-800">
          <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Suggested outcome: <strong>{suggestion.suggestedResult}</strong>
            {suggestion.suggestedReason ? ` — ${suggestion.suggestedReason}` : ""}.
            Review the readings below and confirm.
          </span>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sample date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lab report #
          </span>
          <input
            value={labReportNumber}
            onChange={(e) => setLabReportNumber(e.target.value)}
            placeholder="e.g. LAB-2026-0412 (leave blank if pending)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
          />
        </label>
      </div>

      {hasReadings && (
        <div className="mt-4">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Readings (from report — edit if needed)
          </span>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
            {READING_FIELDS.filter((f) => readings[f.key] !== undefined).map(
              (f) => (
                <label key={f.key} className="block">
                  <span className="mb-0.5 block text-[10px] font-medium text-slate-400">
                    {f.label}
                  </span>
                  <input
                    value={readings[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setReadings((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
                  />
                </label>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Outcome
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setResult("normal")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              result === "normal"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setResult("abnormal")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              result === "abnormal"
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Abnormal
          </button>
          <button
            type="button"
            onClick={() => setResult(null)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              result === null
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Report pending
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {result === null
            ? "No outcome yet — this sample stays open until the lab report is uploaded and reviewed."
            : "Not sure yet? Upload the PDF above or pick \"Report pending\"."}
        </p>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notes
        </span>
        <textarea
          value={notes}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations, sample point, anything worth recording…"
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
        />
      </label>

      <button type="button" onClick={submit} className="btn-primary mt-4">
        <PlusIcon className="h-4 w-4" />
        {result === "normal"
          ? "Save & file sample"
          : result === "abnormal"
          ? "Save & open corrective action"
          : "Save sample (awaiting report)"}
      </button>
    </div>
  );
}

export function SampleWorkflowPanel({ equipment }: { equipment: Equipment }) {
  const active = equipment.activeSample;

  if (!active) {
    return (
      <div>
        <LastSampleSummary equipment={equipment} />
        <StartSampleForm equipment={equipment} />
      </div>
    );
  }

  if (active.result === "abnormal") {
    return (
      <div className="space-y-3">
        <SampleMeta equipmentId={equipment.id} sample={active} />
        <LabReadingsFields equipmentId={equipment.id} sample={active} />
        <ActiveActionFlow equipmentId={equipment.id} sample={active} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.result === null && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <ClockIcon className="h-4 w-4" />
          Awaiting lab report — upload the PDF below once it arrives.
        </div>
      )}
      <SampleMeta equipmentId={equipment.id} sample={active} />
      <LabReadingsFields
        equipmentId={equipment.id}
        sample={active}
        allowUpload={active.result === null}
      />
    </div>
  );
}
