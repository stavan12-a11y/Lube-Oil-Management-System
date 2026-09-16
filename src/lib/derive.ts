import type { Equipment, EquipmentStatus, OilSample } from "../types";
import {
  addDays,
  daysBetween,
  formatDate,
  parseDate,
  todayDate,
  WARNING_WINDOW_DAYS,
} from "./helpers";

/** Most recent archived sample for a piece of equipment, by sample date. */
export function getMostRecentHistory(equipment: Equipment): OilSample | null {
  if (equipment.history.length === 0) return null;
  return [...equipment.history].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  )[0];
}

export function getEquipmentStatus(equipment: Equipment): EquipmentStatus {
  const active = equipment.activeSample;
  if (active) {
    if (active.result === "abnormal") return "critical";
    if (active.result === null) return "testing";
    // Legacy: a completed sample left on the active slot still reads green.
    return "normal";
  }
  // No active sample: derive from the most recent archived round.
  const last = getMostRecentHistory(equipment);
  if (!last) return "none";
  return last.result === "normal" ? "normal" : "none";
}

/** The date of the most recent sample (active or archived), if any. */
export function getLastSampledDate(equipment: Equipment): string | null {
  const dates: string[] = [];
  if (equipment.activeSample) dates.push(equipment.activeSample.date);
  for (const h of equipment.history) dates.push(h.date);
  if (dates.length === 0) return null;
  return dates.sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime())[0];
}

export interface ScheduleInfo {
  /** Reference date used to compute the next-due date. */
  basisDate: string;
  nextDueDate: Date;
  /** Safe display string for the next-due date. */
  nextDueLabel: string;
  /** Positive => overdue by N days. */
  daysOverdue: number;
  /** Days remaining until due (negative when overdue). */
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export function getScheduleInfo(
  equipment: Equipment,
  now = new Date()
): ScheduleInfo {
  const basis = getLastSampledDate(equipment) ?? todayDate();
  let basisDate = parseDate(basis);
  if (Number.isNaN(basisDate.getTime())) {
    basisDate = parseDate(todayDate());
  }
  const nextDueDate = addDays(basisDate, equipment.samplingIntervalDays);
  const safeDue =
    Number.isNaN(nextDueDate.getTime()) ? parseDate(todayDate()) : nextDueDate;
  const daysUntilDue = daysBetween(now, safeDue);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = !isOverdue && daysUntilDue <= WARNING_WINDOW_DAYS;
  const dueIso = Number.isNaN(safeDue.getTime())
    ? todayDate()
    : safeDue.toISOString().slice(0, 10);
  return {
    basisDate: basis,
    nextDueDate: safeDue,
    nextDueLabel: formatDate(dueIso),
    daysOverdue: isOverdue ? -daysUntilDue : 0,
    daysUntilDue,
    isOverdue,
    isDueSoon,
  };
}

export function sampleDurationMs(sample: OilSample): number | null {
  if (!sample.completedAt) return null;
  const ms =
    new Date(sample.completedAt).getTime() - new Date(sample.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export interface FleetStats {
  total: number;
  testing: number;
  critical: number;
  overdue: number;
  dueSoon: number;
  /** Turnaround durations (ms) of all completed sample rounds across the fleet. */
  completedDurations: number[];
}

export function getFleetStats(equipment: Equipment[]): FleetStats {
  let testing = 0;
  let critical = 0;
  let overdue = 0;
  let dueSoon = 0;
  const completedDurations: number[] = [];

  for (const item of equipment) {
    const status = getEquipmentStatus(item);
    if (status === "testing") testing += 1;
    if (status === "critical") critical += 1;

    const schedule = getScheduleInfo(item);
    if (schedule.isOverdue) overdue += 1;
    else if (schedule.isDueSoon) dueSoon += 1;

    const completed: OilSample[] = [...item.history];
    if (item.activeSample?.status === "completed") {
      completed.push(item.activeSample);
    }
    for (const sample of completed) {
      const dur = sampleDurationMs(sample);
      if (dur !== null) completedDurations.push(dur);
    }
  }

  return {
    total: equipment.length,
    testing,
    critical,
    overdue,
    dueSoon,
    completedDurations,
  };
}

export const UNASSIGNED_LOCATION = "Unassigned";

export function normalizeLocation(location: string): string {
  const trimmed = location.trim();
  return trimmed || UNASSIGNED_LOCATION;
}

export function getUniqueLocations(equipment: Equipment[]): string[] {
  const locations = new Set(
    equipment.map((e) => normalizeLocation(e.location))
  );
  return [...locations].sort((a, b) => {
    if (a === UNASSIGNED_LOCATION) return 1;
    if (b === UNASSIGNED_LOCATION) return -1;
    return a.localeCompare(b);
  });
}

export function groupEquipmentByLocation(
  equipment: Equipment[]
): { location: string; equipment: Equipment[] }[] {
  const groups = new Map<string, Equipment[]>();
  for (const item of equipment) {
    const location = normalizeLocation(item.location);
    if (!groups.has(location)) groups.set(location, []);
    groups.get(location)!.push(item);
  }
  return getUniqueLocations(equipment).map((location) => ({
    location,
    equipment: groups.get(location) ?? [],
  }));
}

export const STATUS_META: Record<
  EquipmentStatus,
  { label: string; dot: string; ring: string; text: string; badgeBg: string }
> = {
  critical: {
    label: "Abnormal — action required",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    text: "text-rose-700",
    badgeBg: "bg-rose-50",
  },
  testing: {
    label: "Awaiting lab report",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    badgeBg: "bg-amber-50",
  },
  normal: {
    label: "Normal & filed",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-50",
  },
  none: {
    label: "No sample yet",
    dot: "bg-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-600",
    badgeBg: "bg-slate-100",
  },
};
