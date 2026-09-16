import type { ActivityEntry, Equipment, KpiSnapshot } from "../types";
import { recordDailyKpiSnapshot } from "./kpi";
import { createDemoEquipment } from "./demo";

const STORAGE_KEY = "lube-oil-management:v1";
const ACTIVITY_KEY = "lube-oil-management:activity:v1";
const KPI_HISTORY_KEY = "lube-oil-management:kpi-history:v1";

export function loadEquipment(): Equipment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoEquipment();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDemoEquipment();
    return parsed as Equipment[];
  } catch {
    return createDemoEquipment();
  }
}

export function saveEquipment(equipment: Equipment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment));
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadActivity(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveActivity(entries: ActivityEntry[]): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function loadKpiHistory(equipment: Equipment[]): KpiSnapshot[] {
  try {
    const raw = localStorage.getItem(KPI_HISTORY_KEY);
    if (!raw) {
      return recordDailyKpiSnapshot([], equipment, new Date().toISOString());
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return recordDailyKpiSnapshot([], equipment, new Date().toISOString());
    }
    return parsed as KpiSnapshot[];
  } catch {
    return recordDailyKpiSnapshot([], equipment, new Date().toISOString());
  }
}

export function saveKpiHistory(history: KpiSnapshot[]): void {
  try {
    localStorage.setItem(KPI_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}
