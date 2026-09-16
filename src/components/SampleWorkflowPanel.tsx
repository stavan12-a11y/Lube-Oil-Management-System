import { useState } from "react";
import type { Equipment } from "../types";
import { useLubeOil } from "../store";
import { formatDate, formatDuration } from "../lib/helpers";
import { getMostRecentHistory, sampleDurationMs } from "../lib/derive";
import {
  ActiveActionFlow,
  EditableStepList,
  LabReadingsFields,
  SampleMeta,
} from "./SampleEditing";
import { CheckIcon, PlusIcon, RefreshIcon } from "./icons";

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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<"normal" | "abnormal">("normal");
  const [labReportNumber, setLabReportNumber] = useState("");

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <h4 className="text-sm font-semibold text-slate-800">
        Record a new oil sample
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Record the sample date, lab report #, notes, and the outcome once known.
      </p>

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
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Not sure yet? Start as "Normal" — you can flip to Abnormal once the
          lab report comes back.
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
          placeholder={
            result === "normal"
              ? "Observations, sample point, anything worth recording…"
              : "Describe the abnormal readings / suspected cause…"
          }
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          startSample(equipment.id, { date, notes, result, labReportNumber })
        }
        className="btn-primary mt-4"
      >
        <PlusIcon className="h-4 w-4" />
        Begin sample round
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
      <SampleMeta equipmentId={equipment.id} sample={active} />
      <LabReadingsFields equipmentId={equipment.id} sample={active} />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <EditableStepList
          equipmentId={equipment.id}
          sample={active}
          mode="active"
        />
        <p className="mt-2 px-1 text-[11px] text-slate-400">
          Click Complete once to advance each step. Future steps unlock as you
          finish the current one.
        </p>
      </div>
    </div>
  );
}
