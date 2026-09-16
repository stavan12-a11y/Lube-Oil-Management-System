import type {
  Equipment,
  KpiFilterKey,
  KpiSnapshot,
  KpiTrendMetric,
} from "../types";
import {
  getEquipmentStatus,
  getFleetStats,
  getScheduleInfo,
  sampleDurationMs,
} from "./derive";
import { uid } from "./helpers";

export const KPI_FILTER_LABELS: Record<KpiFilterKey, string> = {
  all: "All equipment",
  compliant: "Compliant (normal & not overdue)",
  overdue: "Overdue samples",
  dueSoon: "Due within 15 days",
  critical: "Abnormal / needs action",
  withTurnaround: "With completed lab rounds",
};

export const KPI_TREND_LABELS: Record<KpiTrendMetric, string> = {
  total: "Total equipment",
  compliant: "Compliant count",
  complianceRate: "Compliance rate (%)",
  overdue: "Overdue count",
  dueSoon: "Due soon count",
  critical: "Critical count",
  avgTurnaround: "Average lab turnaround (days)",
};

export function isEquipmentCompliant(equipment: Equipment): boolean {
  return (
    getEquipmentStatus(equipment) === "normal" &&
    !getScheduleInfo(equipment).isOverdue
  );
}

export function equipmentHasCompletedSample(equipment: Equipment): boolean {
  const completed = [...equipment.history];
  if (equipment.activeSample?.status === "completed") {
    completed.push(equipment.activeSample);
  }
  return completed.some((sample) => sampleDurationMs(sample) !== null);
}

export function countCompliant(equipment: Equipment[]): number {
  return equipment.filter(isEquipmentCompliant).length;
}

export function complianceRate(equipment: Equipment[]): number {
  if (equipment.length === 0) return 0;
  return Math.round((countCompliant(equipment) / equipment.length) * 1000) / 10;
}

export function filterEquipmentByKpi(
  equipment: Equipment[],
  kpi: KpiFilterKey
): Equipment[] {
  switch (kpi) {
    case "compliant":
      return equipment.filter(isEquipmentCompliant);
    case "overdue":
      return equipment.filter((e) => getScheduleInfo(e).isOverdue);
    case "dueSoon":
      return equipment.filter((e) => {
        const s = getScheduleInfo(e);
        return s.isDueSoon && !s.isOverdue;
      });
    case "critical":
      return equipment.filter((e) => getEquipmentStatus(e) === "critical");
    case "withTurnaround":
      return equipment.filter(equipmentHasCompletedSample);
    default:
      return equipment;
  }
}

export function buildKpiSnapshot(equipment: Equipment[], at: string): KpiSnapshot {
  const stats = getFleetStats(equipment);
  const compliant = countCompliant(equipment);
  const avgMs =
    stats.completedDurations.length > 0
      ? stats.completedDurations.reduce((sum, d) => sum + d, 0) /
        stats.completedDurations.length
      : null;

  return {
    id: uid("kpi"),
    at,
    total: stats.total,
    compliant,
    complianceRate: complianceRate(equipment),
    overdue: stats.overdue,
    dueSoon: stats.dueSoon,
    critical: stats.critical,
    avgTurnaroundDays:
      avgMs !== null
        ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
        : null,
  };
}

function dayKey(at: string): string {
  return at.slice(0, 10);
}

/** Keep the latest snapshot for each calendar day, newest first. */
export function dedupeKpiHistoryByDay(history: KpiSnapshot[]): KpiSnapshot[] {
  const byDay = new Map<string, KpiSnapshot>();
  for (const snap of history) {
    const day = dayKey(snap.at);
    const existing = byDay.get(day);
    if (!existing || new Date(snap.at).getTime() > new Date(existing.at).getTime()) {
      byDay.set(day, snap);
    }
  }
  return Array.from(byDay.values()).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

/** Record or refresh today's compliance snapshot — at most one entry per day. */
export function recordDailyKpiSnapshot(
  history: KpiSnapshot[],
  equipment: Equipment[],
  at: string
): KpiSnapshot[] {
  const today = dayKey(at);
  const next = buildKpiSnapshot(equipment, at);
  const withoutToday = history.filter((s) => dayKey(s.at) !== today);
  return [next, ...withoutToday].slice(0, 366);
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Seed daily trend points for demo reset only. */
export function createDemoKpiHistory(equipment: Equipment[]): KpiSnapshot[] {
  const snapshots: KpiSnapshot[] = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
    const at = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
    const drift = daysAgo * 0.02;
    const current = buildKpiSnapshot(equipment, at);
    const overdue = Math.max(
      0,
      Math.min(current.total, Math.round(current.overdue + drift))
    );
    const critical = Math.max(
      0,
      Math.min(current.total, Math.round(current.critical + (daysAgo % 5) * 0.1))
    );
    const compliant = Math.max(0, current.total - overdue - critical);
    snapshots.push({
      ...current,
      id: uid("kpi"),
      at,
      overdue,
      critical,
      compliant,
      complianceRate:
        current.total > 0
          ? Math.round((compliant / current.total) * 1000) / 10
          : 0,
    });
  }
  return dedupeKpiHistoryByDay(snapshots);
}

export function normalizeKpiHistory(
  raw: unknown,
  equipment: Equipment[]
): KpiSnapshot[] {
  const at = new Date().toISOString();
  if (!Array.isArray(raw) || raw.length === 0) {
    return recordDailyKpiSnapshot([], equipment, at);
  }
  const deduped = dedupeKpiHistoryByDay(raw as KpiSnapshot[]);
  return recordDailyKpiSnapshot(deduped, equipment, at);
}

export function snapshotMetricValue(
  snapshot: KpiSnapshot,
  metric: KpiTrendMetric
): string | number {
  switch (metric) {
    case "total":
      return snapshot.total;
    case "compliant":
      return snapshot.compliant;
    case "complianceRate":
      return snapshot.complianceRate;
    case "overdue":
      return snapshot.overdue;
    case "dueSoon":
      return snapshot.dueSoon;
    case "critical":
      return snapshot.critical;
    case "avgTurnaround":
      return snapshot.avgTurnaroundDays ?? "";
    default:
      return "";
  }
}
