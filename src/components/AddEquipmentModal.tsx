import { useEffect, useState } from "react";
import { useLubeOil, type NewEquipmentInput } from "../store";
import { CloseIcon, PlusIcon } from "./icons";

const EMPTY: NewEquipmentInput = {
  name: "",
  type: "Centrifugal Pump",
  manufacturer: "",
  location: "",
  criticality: "Essential",
  lubricantType: "Turbine Oil",
  lubricantGrade: "",
  oilCapacityLitres: "",
  samplingIntervalDays: 90,
};

const TYPES = [
  "Centrifugal Pump",
  "Reciprocating Pump",
  "Screw Compressor",
  "Reciprocating Compressor",
  "Steam Turbine",
  "Gas Turbine",
  "Gearbox",
  "Electric Motor",
  "Blower / Fan",
  "Diesel Engine",
  "Hydraulic Power Unit",
  "Other",
];

const LUBRICANT_TYPES = [
  "Turbine Oil",
  "Gear Oil",
  "Compressor Oil",
  "Hydraulic Oil",
  "Engine Oil",
  "Circulating Oil",
  "Grease",
];

const CRITICALITY_OPTIONS: NewEquipmentInput["criticality"][] = [
  "Critical",
  "Essential",
  "Non-Critical",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls = "input";

export function AddEquipmentModal({
  onClose,
  initialValues,
}: {
  onClose: () => void;
  initialValues?: NewEquipmentInput;
}) {
  const { addEquipment } = useLubeOil();
  const [form, setForm] = useState<NewEquipmentInput>(() => initialValues ?? EMPTY);
  const isDuplicate = Boolean(initialValues?.duplicatedFrom);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof NewEquipmentInput>(
    key: K,
    value: NewEquipmentInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addEquipment({
      ...form,
      name: form.name.trim(),
      location: form.location.trim() || "Unassigned",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="presentation"
        className="absolute inset-0"
        onMouseDown={onClose}
      />
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg animate-fade-in overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isDuplicate ? "Duplicate equipment" : "Add equipment"}
            </h2>
            {isDuplicate && (
              <p className="mt-0.5 text-xs text-slate-500">
                Specs copied from{" "}
                <span className="font-semibold">{initialValues?.duplicatedFrom}</span>.
                Update the tag and location.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name / tag">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. P-102B"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={inputCls}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Criticality">
            <select
              value={form.criticality}
              onChange={(e) =>
                set("criticality", e.target.value as NewEquipmentInput["criticality"])
              }
              className={inputCls}
            >
              {CRITICALITY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Lubricant type">
            <select
              value={form.lubricantType}
              onChange={(e) => set("lubricantType", e.target.value)}
              className={inputCls}
            >
              {LUBRICANT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Lubricant grade">
            <input
              value={form.lubricantGrade}
              onChange={(e) => set("lubricantGrade", e.target.value)}
              placeholder="e.g. ISO VG 68 — Mobil DTE 26"
              className={inputCls}
            />
          </Field>
          <Field label="Oil capacity">
            <input
              value={form.oilCapacityLitres}
              onChange={(e) => set("oilCapacityLitres", e.target.value)}
              placeholder="e.g. 80 L"
              className={inputCls}
            />
          </Field>
          <Field label="Sampling interval (days)">
            <input
              type="number"
              min={1}
              step={1}
              value={form.samplingIntervalDays}
              onChange={(e) =>
                set("samplingIntervalDays", Number(e.target.value) || 90)
              }
              className={inputCls}
            />
          </Field>
          <Field label="Manufacturer">
            <input
              value={form.manufacturer}
              onChange={(e) => set("manufacturer", e.target.value)}
              placeholder="e.g. Flowserve"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Pump House — Unit 1"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            {isDuplicate ? "Create duplicate" : "Add equipment"}
          </button>
        </div>
      </form>
    </div>
  );
}
