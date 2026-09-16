import { useEffect, useMemo, useState } from "react";
import type { ActivityEntry } from "../types";
import { useLubeOil } from "../store";
import { formatDate } from "../lib/helpers";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HistoryClockIcon,
  TrashIcon,
} from "./icons";

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function ChangeRow({
  entry,
  showEquipmentName = true,
}: {
  entry: ActivityEntry;
  showEquipmentName?: boolean;
}) {
  const hasDiff = entry.from !== undefined || entry.to !== undefined;
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className="mt-0.5 w-12 shrink-0 text-[11px] font-medium text-slate-400">
        {timeOf(entry.at)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showEquipmentName && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {entry.equipmentName}
            </span>
          )}
          <span className="text-sm text-slate-700">{entry.summary}</span>
        </div>
        {hasDiff && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {entry.from !== undefined && (
              <span className="rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-rose-600 line-through decoration-rose-300">
                {entry.from || "(empty)"}
              </span>
            )}
            {entry.from !== undefined && entry.to !== undefined && (
              <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300" />
            )}
            {entry.to !== undefined && (
              <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                {entry.to || "(empty)"}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function ActivityLogContent({
  equipmentId,
  showEquipmentName = true,
}: {
  equipmentId?: string;
  showEquipmentName?: boolean;
}) {
  const { activity } = useLubeOil();
  const [query, setQuery] = useState("");

  const scoped = useMemo(() => {
    if (!equipmentId) return activity;
    return activity.filter((e) => e.equipmentId === equipmentId);
  }, [activity, equipmentId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (e) =>
        e.equipmentName.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        (e.from ?? "").toLowerCase().includes(q) ||
        (e.to ?? "").toLowerCase().includes(q)
    );
  }, [scoped, query]);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const entry of filtered) {
      const key = dayKey(entry.at);
      const arr = map.get(key);
      if (arr) arr.push(entry);
      else map.set(key, [entry]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search changes by field or value…"
        className="input mb-4"
      />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <HistoryClockIcon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">
            {scoped.length === 0
              ? "No changes recorded yet"
              : "No changes match your search"}
          </p>
          <p className="text-xs text-slate-400">
            Edits to this equipment's specs and oil samples will appear here
            with before and after values.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, entries]) => (
            <div key={day}>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                {formatDate(day)}
              </div>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {entries.map((entry) => (
                  <ChangeRow
                    key={entry.id}
                    entry={entry}
                    showEquipmentName={showEquipmentName}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityLog({ onClose }: { onClose: () => void }) {
  const { activity, clearActivity } = useLubeOil();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      <header className="sticky top-0 z-10 shadow-md">
        <div className="bg-oil-900 text-white">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Back to fleet</span>
              </button>
              <div className="flex items-center gap-2">
                <HistoryClockIcon className="h-5 w-5 text-oil-200" />
                <h2 className="text-lg font-bold sm:text-xl">Change history</h2>
              </div>
            </div>
            {activity.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear the entire change history?")) {
                    clearActivity();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear log</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <ActivityLogContent />
        </div>
      </div>
    </div>
  );
}
