import { useState } from "react";
import type { Equipment } from "../types";
import { getEquipmentStatus, getScheduleInfo } from "../lib/derive";
import { AlertIcon, ClockIcon, WrenchIcon } from "./icons";

type SidebarTab = "schedule" | "actions";

export function Sidebar({
  equipment,
  onSelect,
}: {
  equipment: Equipment[];
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("schedule");

  const scheduled = equipment
    .map((e) => ({ equipment: e, schedule: getScheduleInfo(e) }))
    .filter(({ schedule }) => schedule.isOverdue || schedule.isDueSoon)
    .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);

  const overdue = scheduled.filter((s) => s.schedule.isOverdue);
  const dueSoon = scheduled.filter((s) => s.schedule.isDueSoon);

  const needsAction = equipment.filter(
    (e) => getEquipmentStatus(e) === "critical"
  );

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("schedule")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
              tab === "schedule"
                ? "bg-oil-100 text-oil-800"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <ClockIcon className="h-3.5 w-3.5" />
            Schedule
            {scheduled.length > 0 && (
              <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                {scheduled.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("actions")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
              tab === "actions"
                ? "bg-oil-100 text-oil-800"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <WrenchIcon className="h-3.5 w-3.5" />
            Actions
            {needsAction.length > 0 && (
              <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                {needsAction.length}
              </span>
            )}
          </button>
        </div>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto p-4">
          {tab === "schedule" ? (
            scheduled.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                All oil samples up to date.
              </p>
            ) : (
              <div className="space-y-3">
                {overdue.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-500">
                      Overdue ({overdue.length})
                    </div>
                    <ul className="space-y-1.5">
                      {overdue.map(({ equipment: e, schedule }) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(e.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left transition hover:bg-rose-100"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {e.name}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {e.location}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-rose-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                              <AlertIcon className="h-3 w-3" />
                              {schedule.daysOverdue}d
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {dueSoon.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-500">
                      Due soon ({dueSoon.length})
                    </div>
                    <ul className="space-y-1.5">
                      {dueSoon.map(({ equipment: e, schedule }) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(e.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {e.name}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {e.location}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              {schedule.daysUntilDue}d
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          ) : needsAction.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              No equipment awaiting corrective action.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {needsAction.map((e) => {
                const count = e.activeSample?.actions.length ?? 0;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left transition hover:bg-rose-100"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {e.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {e.location}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md bg-rose-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        {count} {count === 1 ? "action" : "actions"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </aside>
  );
}
