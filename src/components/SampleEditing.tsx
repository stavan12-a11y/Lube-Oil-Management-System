import { useState } from "react";
import type { LabReadings, OilSample } from "../types";
import { useLubeOil } from "../store";
import { isoToLocalInput, localInputToIso } from "../lib/helpers";
import { InlineText } from "./ui";
import { LabReportUpload } from "./LabReportUpload";
import { ClockIcon, PlusIcon, RefreshIcon, TrashIcon, WrenchIcon } from "./icons";

export const READING_FIELDS: {
  key: keyof LabReadings;
  label: string;
  placeholder: string;
}[] = [
  { key: "viscosity40", label: "Viscosity @40°C (cSt)", placeholder: "e.g. 31.8" },
  { key: "viscosity100", label: "Viscosity @100°C (cSt)", placeholder: "e.g. 5.4" },
  { key: "viscosityIndex", label: "Viscosity index", placeholder: "e.g. 102" },
  { key: "waterPpm", label: "Water content (ppm)", placeholder: "e.g. 68" },
  { key: "tan", label: "TAN (mg KOH/g)", placeholder: "e.g. 0.12" },
  { key: "isoCleanliness", label: "ISO 4406 cleanliness", placeholder: "e.g. 16/14/11" },
  { key: "ferrousWearPpm", label: "Ferrous wear (ppm)", placeholder: "e.g. 8" },
  { key: "flashPointC", label: "Flash point (°C)", placeholder: "e.g. 214" },
];

/** Compact editable grid of lab readings for a sample. */
export function LabReadingsFields({
  equipmentId,
  sample,
  allowUpload = false,
}: {
  equipmentId: string;
  sample: OilSample;
  /** Show a PDF upload control that fills these fields directly (used once a report is expected but not yet attached). */
  allowUpload?: boolean;
}) {
  const { editSample } = useLubeOil();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Lab readings
        </span>
        {sample.labReportFileName && (
          <span className="text-[11px] text-slate-400">
            From {sample.labReportFileName}
          </span>
        )}
      </div>
      {allowUpload && (
        <div className="mb-3">
          <LabReportUpload
            compact
            onExtracted={(result) => {
              editSample(equipmentId, sample.id, {
                readings: result.readings,
                labReportNumber:
                  result.labReportNumber || sample.labReportNumber,
                labReportFileName: result.fileName,
              });
            }}
          />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {READING_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-0.5 block text-[10px] font-medium text-slate-400">
              {f.label}
            </span>
            <input
              value={sample.readings[f.key]}
              placeholder={f.placeholder}
              onChange={(e) =>
                editSample(equipmentId, sample.id, {
                  readings: { [f.key]: e.target.value },
                })
              }
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Editable date / result / lab report / notes header for any sample. */
export function SampleMeta({
  equipmentId,
  sample,
}: {
  equipmentId: string;
  sample: OilSample;
}) {
  const { editSample } = useLubeOil();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Sample date
          </span>
          <input
            type="date"
            value={sample.date}
            onChange={(e) =>
              editSample(equipmentId, sample.id, { date: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Lab report #
          </span>
          <input
            value={sample.labReportNumber}
            placeholder="e.g. LAB-2026-0412"
            onChange={(e) =>
              editSample(equipmentId, sample.id, {
                labReportNumber: e.target.value,
              })
            }
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
          />
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Outcome
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              editSample(equipmentId, sample.id, { result: "normal" })
            }
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
              sample.result === "normal"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() =>
              editSample(equipmentId, sample.id, { result: "abnormal" })
            }
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
              sample.result === "abnormal"
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Abnormal
          </button>
        </div>
        {sample.result === null && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
            <ClockIcon className="h-3 w-3" />
            Awaiting lab report — choosing an outcome files this sample.
          </p>
        )}
      </div>
      <div className="mt-2">
        <span className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Notes
        </span>
        <InlineText
          value={sample.notes}
          placeholder="Add sample notes…"
          onCommit={(v) => editSample(equipmentId, sample.id, { notes: v })}
        />
      </div>
    </div>
  );
}

/** Editable, deletable corrective actions with an add field. */
export function ActionList({
  equipmentId,
  sample,
}: {
  equipmentId: string;
  sample: OilSample;
}) {
  const { addAction, editAction, removeAction, setActionDate } = useLubeOil();
  const [action, setAction] = useState("");

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <WrenchIcon className="h-3.5 w-3.5" /> Corrective action log
      </span>

      {sample.actions.length > 0 ? (
        <ul className="space-y-1.5">
          {sample.actions.map((act) => (
            <li
              key={act.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ClockIcon className="h-3 w-3" />
                  <input
                    type="datetime-local"
                    value={isoToLocalInput(act.loggedAt)}
                    onChange={(e) =>
                      setActionDate(
                        equipmentId,
                        sample.id,
                        act.id,
                        localInputToIso(e.target.value)
                      )
                    }
                    title="Edit the date and time this action was logged"
                    className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-slate-500 outline-none transition hover:border-slate-200 hover:bg-white focus:border-oil-700 focus:bg-white focus:text-slate-700 focus:ring-1 focus:ring-oil-700"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => removeAction(equipmentId, sample.id, act.id)}
                  className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  title="Delete action"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <InlineText
                value={act.description}
                placeholder="Describe the corrective action…"
                onCommit={(v) => editAction(equipmentId, sample.id, act.id, v)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-xs italic text-slate-400">
          No corrective actions logged yet.
        </p>
      )}

      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <textarea
          value={action}
          rows={2}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Describe a corrective action taken (e.g. oil change, filter replacement, seal repair)…"
          className="w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
        <button
          type="button"
          disabled={!action.trim()}
          onClick={() => {
            addAction(equipmentId, sample.id, action.trim());
            setAction("");
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Log action
        </button>
      </div>
    </div>
  );
}

/** The corrective-action flow shown for an active abnormal sample. */
export function ActiveActionFlow({
  equipmentId,
  sample,
}: {
  equipmentId: string;
  sample: OilSample;
}) {
  const { resolveSample } = useLubeOil();

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
        <WrenchIcon className="h-4 w-4" />
        Abnormal result — corrective action required
      </div>
      <ActionList equipmentId={equipmentId} sample={sample} />
      <button
        type="button"
        disabled={sample.actions.length === 0}
        onClick={() => resolveSample(equipmentId)}
        className="btn-primary mt-3"
        title={
          sample.actions.length === 0
            ? "Log at least one corrective action before resolving"
            : undefined
        }
      >
        <RefreshIcon className="h-4 w-4" />
        Mark resolved &amp; archive
      </button>
    </div>
  );
}
