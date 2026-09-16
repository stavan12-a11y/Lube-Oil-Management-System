export const SAMPLE_WORKFLOW_STEPS = [
  { key: "collected", label: "Sample Collected" },
  { key: "sent_to_lab", label: "Sent to Lab" },
  { key: "report_received", label: "Lab Report Received" },
  { key: "reviewed", label: "Reviewed & Filed" },
] as const;

export type WorkflowStepKey = (typeof SAMPLE_WORKFLOW_STEPS)[number]["key"];

export interface WorkflowStep {
  key: WorkflowStepKey;
  label: string;
  completed: boolean;
  /** ISO timestamp captured when the step is marked complete. */
  completedAt: string | null;
  notes: string;
}

export interface CorrectiveAction {
  id: string;
  /** ISO timestamp the action was logged. */
  loggedAt: string;
  description: string;
}

export type SampleResult = "normal" | "abnormal";
export type SampleStatus = "in-progress" | "completed";

/** Oil laboratory analysis readings for a single sample. */
export interface LabReadings {
  /** Kinematic viscosity at 40°C, cSt. */
  viscosity40: string;
  /** Kinematic viscosity at 100°C, cSt. */
  viscosity100: string;
  viscosityIndex: string;
  /** Water content, ppm (Karl Fischer). */
  waterPpm: string;
  /** Total Acid Number, mg KOH/g. */
  tan: string;
  /** ISO 4406 cleanliness code, e.g. "18/16/13". */
  isoCleanliness: string;
  /** Ferrous wear metal content, ppm. */
  ferrousWearPpm: string;
  /** Flash point, °C. */
  flashPointC: string;
}

export function emptyLabReadings(): LabReadings {
  return {
    viscosity40: "",
    viscosity100: "",
    viscosityIndex: "",
    waterPpm: "",
    tan: "",
    isoCleanliness: "",
    ferrousWearPpm: "",
    flashPointC: "",
  };
}

export interface OilSample {
  id: string;
  /** Calendar date the sample was drawn (yyyy-mm-dd). */
  date: string;
  /** ISO timestamp the sample round started. */
  startedAt: string;
  /** ISO timestamp the sample round was completed (filed or resolved). */
  completedAt: string | null;
  labReportNumber: string;
  notes: string;
  result: SampleResult;
  readings: LabReadings;
  steps: WorkflowStep[];
  actions: CorrectiveAction[];
  status: SampleStatus;
}

export type Criticality = "Critical" | "Essential" | "Non-Critical";

export interface Equipment {
  id: string;
  /** Equipment tag, e.g. "P-101A". */
  name: string;
  /** Equipment class, e.g. Centrifugal Pump, Gearbox, Compressor. */
  type: string;
  manufacturer: string;
  location: string;
  criticality: Criticality;
  /** Lubricant category, e.g. Turbine Oil, Gear Oil, Hydraulic Oil. */
  lubricantType: string;
  /** Grade / brand, e.g. "ISO VG 68 — Mobil DTE 26". */
  lubricantGrade: string;
  oilCapacityLitres: string;
  /** How often (in days) an oil sample must be drawn and analyzed. */
  samplingIntervalDays: number;
  activeSample: OilSample | null;
  history: OilSample[];
}

/** The full shared application state (persisted locally or to Neon). */
export interface AppState {
  equipment: Equipment[];
  activity: ActivityEntry[];
  kpiHistory: KpiSnapshot[];
}

export interface ActivityEntry {
  id: string;
  /** ISO timestamp the change was recorded. */
  at: string;
  equipmentId: string | null;
  equipmentName: string;
  /** Short, human-readable description of what happened. */
  summary: string;
  /** Optional before value for edits. */
  from?: string;
  /** Optional after value for edits. */
  to?: string;
}

/**
 * Visual status derived from an equipment item's sampling state.
 * - critical: red   — abnormal lab result, corrective action required
 * - testing:  amber — a sample is in the lab / being processed
 * - normal:   green — most recent sample was normal and filed
 * - none:     gray  — no sample has ever been recorded
 */
export type EquipmentStatus = "critical" | "testing" | "normal" | "none";

export type KpiFilterKey =
  | "all"
  | "compliant"
  | "overdue"
  | "dueSoon"
  | "critical"
  | "withTurnaround";

export type KpiTrendMetric =
  | "total"
  | "compliant"
  | "complianceRate"
  | "overdue"
  | "dueSoon"
  | "critical"
  | "avgTurnaround";

/** Point-in-time fleet KPI metrics for trend comparison. */
export interface KpiSnapshot {
  id: string;
  /** ISO timestamp when the snapshot was recorded. */
  at: string;
  total: number;
  compliant: number;
  complianceRate: number;
  overdue: number;
  dueSoon: number;
  critical: number;
  avgTurnaroundDays: number | null;
}
