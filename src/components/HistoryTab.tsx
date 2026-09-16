import { useState } from "react";
import type { Equipment, OilSample } from "../types";
import { useLubeOil } from "../store";
import { sampleDurationMs } from "../lib/derive";
import { formatDate, formatDuration, parseDate } from "../lib/helpers";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  TrashIcon,
} from "./icons";
import {
  ActionList,
  EditableStepList,
  LabReadingsFields,
  SampleMeta,
} from "./SampleEditing";

function ResultPill({ result }: { result: OilSample["result"] }) {
  if (result === "normal") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckIcon className="h-3 w-3" /> Normal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
      <AlertIcon className="h-3 w-3" /> Abnormal
    </span>
  );
}

function HistoryEntry({
  equipmentId,
  sample,
}: {
  equipmentId: string;
  sample: OilSample;
}) {
  const { deleteSample } = useLubeOil();
  const [open, setOpen] = useState(false);
  const durationMs = sampleDurationMs(sample);
  const showSteps = sample.result === "normal" || sample.steps.length > 0;
  const showActions = sample.result === "abnormal" || sample.actions.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {formatDate(sample.date)}
              {sample.labReportNumber ? (
                <span className="ml-2 font-normal text-slate-400">
                  {sample.labReportNumber}
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-slate-400">
              {durationMs !== null && sample.completedAt
                ? `Took ${formatDuration(sample.startedAt, sample.completedAt)}`
                : "Duration n/a"}
            </div>
          </div>
        </div>
        <ResultPill result={sample.result} />
      </button>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <SampleMeta equipmentId={equipmentId} sample={sample} />
          <LabReadingsFields equipmentId={equipmentId} sample={sample} />

          {showSteps && (
            <div>
              <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Workflow timeline
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <EditableStepList
                  equipmentId={equipmentId}
                  sample={sample}
                  mode="history"
                />
              </div>
            </div>
          )}

          {showActions && (
            <ActionList equipmentId={equipmentId} sample={sample} />
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this archived sample? This cannot be undone."
                  )
                ) {
                  deleteSample(equipmentId, sample.id);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete sample
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryTab({ equipment }: { equipment: Equipment }) {
  if (equipment.history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <ClockIcon className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-500">
          No archived samples yet
        </p>
        <p className="text-xs text-slate-400">
          Completed sample rounds will appear here once archived.
        </p>
      </div>
    );
  }

  const samples = [...equipment.history].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  );

  return (
    <div className="space-y-2.5">
      {samples.map((smp) => (
        <HistoryEntry key={smp.id} equipmentId={equipment.id} sample={smp} />
      ))}
    </div>
  );
}
