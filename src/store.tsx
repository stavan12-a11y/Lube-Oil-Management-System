import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEntry,
  AppState,
  Equipment,
  KpiSnapshot,
  OilSample,
  SampleResult,
} from "./types";
import { emptyLabReadings } from "./types";
import { createDemoEquipment } from "./lib/demo";
import {
  loadActivity,
  loadEquipment,
  loadKpiHistory,
  saveActivity,
  saveEquipment,
  saveKpiHistory,
} from "./lib/storage";
import { createDemoKpiHistory, normalizeKpiHistory, recordDailyKpiSnapshot } from "./lib/kpi";
import {
  cloudLoadState,
  cloudSaveState,
  CLOUD_POLL_MS,
} from "./lib/cloudApi";
import { useAuth } from "./auth/AuthContext";

export type SyncStatus = "local" | "loading" | "saving" | "saved" | "error";
import {
  formatDate,
  formatDateTime,
  freshWorkflowSteps,
  nowIso,
  uid,
} from "./lib/helpers";

const EQUIPMENT_FIELD_LABELS: Partial<Record<keyof Equipment, string>> = {
  name: "Name / tag",
  type: "Type",
  manufacturer: "Manufacturer",
  location: "Location",
  criticality: "Criticality",
  lubricantType: "Lubricant type",
  lubricantGrade: "Lubricant grade",
  oilCapacityLitres: "Oil capacity",
  samplingIntervalDays: "Sampling interval (days)",
};

function trunc(value: string, max = 80): string {
  const v = (value ?? "").trim();
  if (!v) return "(empty)";
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

const MAX_ACTIVITY = 500;

export interface NewEquipmentInput {
  name: string;
  type: string;
  manufacturer: string;
  location: string;
  criticality: Equipment["criticality"];
  lubricantType: string;
  lubricantGrade: string;
  oilCapacityLitres: string;
  samplingIntervalDays: number;
  /** Not persisted — used for the activity log when duplicating equipment. */
  duplicatedFrom?: string;
}

/** Copy specs from existing equipment into a new-equipment form. */
export function equipmentDuplicateInput(source: Equipment): NewEquipmentInput {
  const copySuffix = / \(copy(?: \d+)?\)$/.test(source.name) ? "" : " (copy)";
  return {
    name: `${source.name}${copySuffix}`,
    type: source.type,
    manufacturer: source.manufacturer,
    location: source.location,
    criticality: source.criticality,
    lubricantType: source.lubricantType,
    lubricantGrade: source.lubricantGrade,
    oilCapacityLitres: source.oilCapacityLitres,
    samplingIntervalDays: source.samplingIntervalDays,
    duplicatedFrom: source.name,
  };
}

export interface StartSampleInput {
  date: string;
  notes: string;
  result: SampleResult;
  labReportNumber: string;
}

interface LubeOilContextValue {
  equipment: Equipment[];
  addEquipment: (input: NewEquipmentInput) => void;
  updateEquipmentField: <K extends keyof Equipment>(
    equipmentId: string,
    field: K,
    value: Equipment[K]
  ) => void;
  removeEquipment: (equipmentId: string) => void;
  startSample: (equipmentId: string, input: StartSampleInput) => void;
  /** Advance the active workflow; archives to history when the final step is done. */
  completeStep: (equipmentId: string, stepKey: string, notes: string) => void;
  resolveSample: (equipmentId: string) => void;
  /** Edit any sample (active or archived) — date, notes, result, lab report #, readings. */
  editSample: (
    equipmentId: string,
    sampleId: string,
    patch: Partial<
      Pick<OilSample, "date" | "notes" | "result" | "labReportNumber">
    > & { readings?: Partial<OilSample["readings"]> }
  ) => void;
  setStepNotes: (
    equipmentId: string,
    sampleId: string,
    stepKey: string,
    notes: string
  ) => void;
  setStepCompleted: (
    equipmentId: string,
    sampleId: string,
    stepKey: string,
    completed: boolean
  ) => void;
  /** Edit the timestamp captured for a completed step (ISO string). */
  setStepDate: (
    equipmentId: string,
    sampleId: string,
    stepKey: string,
    completedAt: string
  ) => void;
  addAction: (equipmentId: string, sampleId: string, description: string) => void;
  editAction: (
    equipmentId: string,
    sampleId: string,
    actionId: string,
    description: string
  ) => void;
  setActionDate: (
    equipmentId: string,
    sampleId: string,
    actionId: string,
    loggedAt: string
  ) => void;
  removeAction: (equipmentId: string, sampleId: string, actionId: string) => void;
  deleteSample: (equipmentId: string, sampleId: string) => void;
  resetToDemo: () => void;
  /** Chronological audit trail of every change (most recent first). */
  activity: ActivityEntry[];
  clearActivity: () => void;
  /** Point-in-time KPI snapshots for trend comparison. */
  kpiHistory: KpiSnapshot[];
  /** Cloud sync state ('local' when running without cloud backend). */
  syncStatus: SyncStatus;
}

const LubeOilContext = createContext<LubeOilContextValue | null>(null);

function mapEquipment(
  equipment: Equipment[],
  equipmentId: string,
  updater: (item: Equipment) => Equipment
): Equipment[] {
  return equipment.map((e) => (e.id === equipmentId ? updater(e) : e));
}

/** Apply an updater to whichever sample (active or archived) matches the id. */
function mapSample(
  equipment: Equipment[],
  equipmentId: string,
  sampleId: string,
  updater: (s: OilSample) => OilSample
): Equipment[] {
  return mapEquipment(equipment, equipmentId, (e) => {
    if (e.activeSample && e.activeSample.id === sampleId) {
      return { ...e, activeSample: updater(e.activeSample) };
    }
    return {
      ...e,
      history: e.history.map((h) => (h.id === sampleId ? updater(h) : h)),
    };
  });
}

export function LubeOilProvider({ children }: { children: ReactNode }) {
  const { authed, mode } = useAuth();
  const cloud = mode === "cloud";
  const cloudApi = mode === "cloud";

  const [equipment, setEquipment] = useState<Equipment[]>(() =>
    cloud ? [] : loadEquipment()
  );
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    cloud ? [] : loadActivity()
  );
  const [kpiHistory, setKpiHistory] = useState<KpiSnapshot[]>(() =>
    cloud ? [] : loadKpiHistory(loadEquipment())
  );
  const [synced, setSynced] = useState(!cloud);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    cloud ? "loading" : "local"
  );
  const firstRun = useRef(true);
  const applyingRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kpiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncStatusRef = useRef<SyncStatus>(cloud ? "loading" : "local");
  const lastLocalEditAt = useRef(0);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  // Keep a live ref of equipment so actions can read the "before" value of
  // edits without depending on a stale closure.
  const equipmentRef = useRef(equipment);
  useEffect(() => {
    equipmentRef.current = equipment;
  }, [equipment]);

  // --- Local mode: persist to localStorage ---------------------------------
  useEffect(() => {
    if (cloud) return;
    if (firstRun.current) {
      firstRun.current = false;
      // Persist initial (possibly demo) state so refreshes are stable.
      saveEquipment(equipment);
      return;
    }
    saveEquipment(equipment);
  }, [equipment, cloud]);

  useEffect(() => {
    if (cloud) return;
    saveActivity(activity);
  }, [activity, cloud]);

  useEffect(() => {
    if (cloud) return;
    saveKpiHistory(kpiHistory);
  }, [kpiHistory, cloud]);

  useEffect(() => {
    if (kpiTimer.current) clearTimeout(kpiTimer.current);
    kpiTimer.current = setTimeout(() => {
      setKpiHistory((prev) =>
        recordDailyKpiSnapshot(prev, equipmentRef.current, nowIso())
      );
    }, 1500);
    return () => {
      if (kpiTimer.current) clearTimeout(kpiTimer.current);
    };
  }, [equipment]);

  // Ensure today's compliance snapshot exists when the app loads.
  useEffect(() => {
    if (cloud && !synced) return;
    setKpiHistory((prev) =>
      recordDailyKpiSnapshot(prev, equipmentRef.current, nowIso())
    );
  }, [cloud, synced]);

  // --- Cloud API mode: load + poll for updates --------------------------------
  useEffect(() => {
    if (!cloudApi || !authed) return;
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    setSyncStatus("loading");

    const loadFromServer = async (initial = false) => {
      if (!initial) {
        if (syncStatusRef.current === "saving") return;
        if (Date.now() - lastLocalEditAt.current < 3000) return;
      }

      const { data: remote, error } = await cloudLoadState();
      if (!active) return;
      if (error && initial) {
        setSyncStatus("error");
        return;
      }
      if (remote && Array.isArray(remote.equipment) && remote.equipment.length > 0) {
        try {
          applyingRemote.current = true;
          setEquipment(remote.equipment);
          setActivity(Array.isArray(remote.activity) ? remote.activity : []);
          setKpiHistory(
            normalizeKpiHistory(remote.kpiHistory, remote.equipment),
          );
        } catch {
          if (initial) setSyncStatus("error");
          return;
        }
      } else if (initial) {
        setSyncStatus("error");
        return;
      }
      if (initial) {
        setSynced(true);
        setSyncStatus("saved");
      } else if (!error) {
        setSyncStatus("saved");
      }
    };

    void loadFromServer(true);
    pollTimer = setInterval(() => void loadFromServer(false), CLOUD_POLL_MS);

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [cloudApi, authed]);

  // --- Cloud API mode: save local edits (debounced) ---------------------------
  useEffect(() => {
    if (!cloudApi || !authed || !synced) return;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    lastLocalEditAt.current = Date.now();
    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot: AppState = { equipment, activity, kpiHistory };
    saveTimer.current = setTimeout(() => {
      cloudSaveState(snapshot).then(({ ok }) =>
        setSyncStatus(ok ? "saved" : "error"),
      );
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [equipment, activity, kpiHistory, cloudApi, authed, synced]);

  const pushLog = useCallback(
    (entry: Omit<ActivityEntry, "id" | "at">) => {
      setActivity((prev) =>
        [{ id: uid("log"), at: nowIso(), ...entry }, ...prev].slice(
          0,
          MAX_ACTIVITY
        )
      );
    },
    []
  );

  const findEquipment = useCallback(
    (equipmentId: string) => equipmentRef.current.find((e) => e.id === equipmentId),
    []
  );

  const findSample = useCallback(
    (equipmentId: string, sampleId: string) => {
      const equipmentItem = equipmentRef.current.find((e) => e.id === equipmentId);
      if (!equipmentItem) return { equipmentItem: undefined, sample: undefined };
      const sample =
        equipmentItem.activeSample?.id === sampleId
          ? equipmentItem.activeSample
          : equipmentItem.history.find((h) => h.id === sampleId);
      return { equipmentItem, sample };
    },
    []
  );

  const clearActivity = useCallback(() => setActivity([]), []);

  const addEquipment = useCallback(
    (input: NewEquipmentInput) => {
      const newEquipment: Equipment = {
        id: uid("eq"),
        name: input.name,
        type: input.type,
        manufacturer: input.manufacturer,
        location: input.location,
        criticality: input.criticality,
        lubricantType: input.lubricantType,
        lubricantGrade: input.lubricantGrade,
        oilCapacityLitres: input.oilCapacityLitres,
        samplingIntervalDays: input.samplingIntervalDays,
        activeSample: null,
        history: [],
      };
      setEquipment((prev) => [...prev, newEquipment]);
      pushLog({
        equipmentId: newEquipment.id,
        equipmentName: newEquipment.name,
        summary: input.duplicatedFrom
          ? `Added equipment (duplicated from "${input.duplicatedFrom}")`
          : "Added equipment to the program",
      });
    },
    [pushLog]
  );

  const updateEquipmentField = useCallback(
    <K extends keyof Equipment>(equipmentId: string, field: K, value: Equipment[K]) => {
      const before = findEquipment(equipmentId);
      const oldValue = before ? before[field] : undefined;
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => ({ ...e, [field]: value }))
      );
      if (before && String(oldValue) !== String(value)) {
        const label = EQUIPMENT_FIELD_LABELS[field] ?? String(field);
        pushLog({
          equipmentId,
          equipmentName:
            field === "name" ? String(value) || before.name : before.name,
          summary: `${label} changed`,
          from: trunc(String(oldValue ?? "")),
          to: trunc(String(value ?? "")),
        });
      }
    },
    [findEquipment, pushLog]
  );

  const removeEquipment = useCallback(
    (equipmentId: string) => {
      const before = findEquipment(equipmentId);
      setEquipment((prev) => prev.filter((e) => e.id !== equipmentId));
      if (before) {
        pushLog({
          equipmentId,
          equipmentName: before.name,
          summary: "Removed equipment from the program",
        });
      }
    },
    [findEquipment, pushLog]
  );

  const startSample = useCallback(
    (equipmentId: string, input: StartSampleInput) => {
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => {
          const sample: OilSample = {
            id: uid("smp"),
            date: input.date,
            startedAt: nowIso(),
            completedAt: null,
            labReportNumber: input.labReportNumber,
            notes: input.notes,
            result: input.result,
            readings: emptyLabReadings(),
            steps: input.result === "normal" ? freshWorkflowSteps() : [],
            actions: [],
            status: "in-progress",
          };
          return { ...e, activeSample: sample };
        })
      );
      const before = findEquipment(equipmentId);
      pushLog({
        equipmentId,
        equipmentName: before?.name ?? "Equipment",
        summary: `Started a new oil sample (${
          input.result === "normal" ? "normal" : "abnormal"
        }) dated ${formatDate(input.date)}`,
      });
    },
    [findEquipment, pushLog]
  );

  const completeStep = useCallback(
    (equipmentId: string, stepKey: string, notes: string) => {
      const before = findEquipment(equipmentId);
      const stepLabel =
        before?.activeSample?.steps.find((s) => s.key === stepKey)?.label ??
        stepKey;
      let archived = false;
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => {
          if (!e.activeSample) return e;
          const smp = e.activeSample;
          const target = smp.steps.find((s) => s.key === stepKey);
          if (!target || target.completed) return e;
          const steps = smp.steps.map((s) =>
            s.key === stepKey
              ? { ...s, completed: true, completedAt: nowIso(), notes }
              : s
          );
          const allDone = steps.every((s) => s.completed);
          if (allDone) {
            archived = true;
            // Final step done: mark complete and archive straight to history.
            const completed: OilSample = {
              ...smp,
              steps,
              status: "completed",
              completedAt: nowIso(),
            };
            return {
              ...e,
              activeSample: null,
              history: [completed, ...e.history],
            };
          }
          return { ...e, activeSample: { ...smp, steps } };
        })
      );
      if (before?.activeSample) {
        pushLog({
          equipmentId,
          equipmentName: before.name,
          summary: `Completed step "${stepLabel}"`,
        });
        if (archived) {
          pushLog({
            equipmentId,
            equipmentName: before.name,
            summary: "Sample completed and archived to history",
          });
        }
      }
    },
    [findEquipment, pushLog]
  );

  const resolveSample = useCallback(
    (equipmentId: string) => {
      const before = findEquipment(equipmentId);
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => {
          if (!e.activeSample) return e;
          // Archive the abnormal (now corrected) sample and clear active so a
          // fresh sample can be started.
          const archived: OilSample = {
            ...e.activeSample,
            status: "completed",
            completedAt: e.activeSample.completedAt ?? nowIso(),
          };
          return {
            ...e,
            history: [archived, ...e.history],
            activeSample: null,
          };
        })
      );
      if (before?.activeSample) {
        pushLog({
          equipmentId,
          equipmentName: before.name,
          summary: "Marked corrective actions complete (archived the abnormal sample)",
        });
      }
    },
    [findEquipment, pushLog]
  );

  const editSample = useCallback(
    (
      equipmentId: string,
      sampleId: string,
      patch: Partial<
        Pick<OilSample, "date" | "notes" | "result" | "labReportNumber">
      > & { readings?: Partial<OilSample["readings"]> }
    ) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => {
          const next: OilSample = {
            ...smp,
            ...patch,
            readings: patch.readings
              ? { ...smp.readings, ...patch.readings }
              : smp.readings,
          };
          // Switching a corrected sample to "normal" needs a workflow to fill.
          if (patch.result === "normal" && next.steps.length === 0) {
            next.steps = freshWorkflowSteps();
          }
          return next;
        })
      );
      if (!equipmentItem || !sample) return;
      const tag = `sample ${formatDate(sample.date)}`;
      if (patch.date !== undefined && patch.date !== sample.date) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Sample date changed (${tag})`,
          from: formatDate(sample.date),
          to: formatDate(patch.date),
        });
      }
      if (patch.result !== undefined && patch.result !== sample.result) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Sample outcome changed (${tag})`,
          from: sample.result === "normal" ? "Normal" : "Abnormal",
          to: patch.result === "normal" ? "Normal" : "Abnormal",
        });
      }
      if (
        patch.labReportNumber !== undefined &&
        patch.labReportNumber !== sample.labReportNumber
      ) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Lab report number changed (${tag})`,
          from: trunc(sample.labReportNumber),
          to: trunc(patch.labReportNumber),
        });
      }
      if (patch.notes !== undefined && patch.notes !== sample.notes) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Sample notes changed (${tag})`,
          from: trunc(sample.notes),
          to: trunc(patch.notes),
        });
      }
      if (patch.readings) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Lab readings updated (${tag})`,
        });
      }
    },
    [findSample, pushLog]
  );

  const setStepNotes = useCallback(
    (equipmentId: string, sampleId: string, stepKey: string, notes: string) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const step = sample?.steps.find((s) => s.key === stepKey);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          steps: smp.steps.map((s) =>
            s.key === stepKey ? { ...s, notes } : s
          ),
        }))
      );
      if (equipmentItem && step && step.notes !== notes) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Step "${step.label}" notes changed`,
          from: trunc(step.notes),
          to: trunc(notes),
        });
      }
    },
    [findSample, pushLog]
  );

  const setStepCompleted = useCallback(
    (
      equipmentId: string,
      sampleId: string,
      stepKey: string,
      completed: boolean
    ) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const step = sample?.steps.find((s) => s.key === stepKey);
      let archived = false;
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => {
          const isActive = e.activeSample?.id === sampleId;
          const target = isActive
            ? e.activeSample
            : e.history.find((h) => h.id === sampleId);
          if (!target) return e;

          const steps = target.steps.map((s) =>
            s.key === stepKey
              ? {
                  ...s,
                  completed,
                  completedAt: completed ? s.completedAt ?? nowIso() : null,
                }
              : s
          );

          if (!isActive) {
            return {
              ...e,
              history: e.history.map((h) =>
                h.id === sampleId ? { ...h, steps } : h
              ),
            };
          }

          const allDone = steps.every((s) => s.completed);
          if (allDone && e.activeSample) {
            archived = true;
            const completedSample: OilSample = {
              ...e.activeSample,
              steps,
              status: "completed",
              completedAt: e.activeSample.completedAt ?? nowIso(),
            };
            return {
              ...e,
              activeSample: null,
              history: [completedSample, ...e.history],
            };
          }

          return {
            ...e,
            activeSample: { ...e.activeSample!, steps },
          };
        })
      );
      if (equipmentItem && step && step.completed !== completed) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Step "${step.label}" marked ${
            completed ? "done" : "not done"
          }`,
          from: step.completed ? "Done" : "Not done",
          to: completed ? "Done" : "Not done",
        });
        if (archived) {
          pushLog({
            equipmentId,
            equipmentName: equipmentItem.name,
            summary: "Sample completed and archived to history",
          });
        }
      }
    },
    [findSample, pushLog]
  );

  const setStepDate = useCallback(
    (
      equipmentId: string,
      sampleId: string,
      stepKey: string,
      completedAt: string
    ) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const step = sample?.steps.find((s) => s.key === stepKey);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          steps: smp.steps.map((s) =>
            s.key === stepKey ? { ...s, completedAt } : s
          ),
        }))
      );
      if (equipmentItem && step && step.completedAt !== completedAt) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Step "${step.label}" date changed`,
          from: formatDateTime(step.completedAt),
          to: formatDateTime(completedAt),
        });
      }
    },
    [findSample, pushLog]
  );

  const addAction = useCallback(
    (equipmentId: string, sampleId: string, description: string) => {
      const { equipmentItem } = findSample(equipmentId, sampleId);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          actions: [
            ...smp.actions,
            { id: uid("act"), loggedAt: nowIso(), description },
          ],
        }))
      );
      if (equipmentItem) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: "Corrective action logged",
          to: trunc(description),
        });
      }
    },
    [findSample, pushLog]
  );

  const editAction = useCallback(
    (
      equipmentId: string,
      sampleId: string,
      actionId: string,
      description: string
    ) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const act = sample?.actions.find((a) => a.id === actionId);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          actions: smp.actions.map((a) =>
            a.id === actionId ? { ...a, description } : a
          ),
        }))
      );
      if (equipmentItem && act && act.description !== description) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: "Corrective action description changed",
          from: trunc(act.description),
          to: trunc(description),
        });
      }
    },
    [findSample, pushLog]
  );

  const setActionDate = useCallback(
    (
      equipmentId: string,
      sampleId: string,
      actionId: string,
      loggedAt: string
    ) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const act = sample?.actions.find((a) => a.id === actionId);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          actions: smp.actions.map((a) =>
            a.id === actionId ? { ...a, loggedAt } : a
          ),
        }))
      );
      if (equipmentItem && act && act.loggedAt !== loggedAt) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: "Corrective action date changed",
          from: formatDateTime(act.loggedAt),
          to: formatDateTime(loggedAt),
        });
      }
    },
    [findSample, pushLog]
  );

  const removeAction = useCallback(
    (equipmentId: string, sampleId: string, actionId: string) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      const act = sample?.actions.find((a) => a.id === actionId);
      setEquipment((prev) =>
        mapSample(prev, equipmentId, sampleId, (smp) => ({
          ...smp,
          actions: smp.actions.filter((a) => a.id !== actionId),
        }))
      );
      if (equipmentItem && act) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: "Corrective action removed",
          from: trunc(act.description),
        });
      }
    },
    [findSample, pushLog]
  );

  const deleteSample = useCallback(
    (equipmentId: string, sampleId: string) => {
      const { equipmentItem, sample } = findSample(equipmentId, sampleId);
      setEquipment((prev) =>
        mapEquipment(prev, equipmentId, (e) => ({
          ...e,
          activeSample: e.activeSample?.id === sampleId ? null : e.activeSample,
          history: e.history.filter((h) => h.id !== sampleId),
        }))
      );
      if (equipmentItem && sample) {
        pushLog({
          equipmentId,
          equipmentName: equipmentItem.name,
          summary: `Deleted sample dated ${formatDate(sample.date)}`,
        });
      }
    },
    [findSample, pushLog]
  );

  const resetToDemo = useCallback(() => {
    const demoEquipment = createDemoEquipment();
    setEquipment(demoEquipment);
    setActivity([]);
    setKpiHistory(createDemoKpiHistory(demoEquipment));
  }, []);

  const value = useMemo<LubeOilContextValue>(
    () => ({
      equipment,
      addEquipment,
      updateEquipmentField,
      removeEquipment,
      startSample,
      completeStep,
      resolveSample,
      editSample,
      setStepNotes,
      setStepCompleted,
      setStepDate,
      addAction,
      editAction,
      setActionDate,
      removeAction,
      deleteSample,
      resetToDemo,
      activity,
      clearActivity,
      kpiHistory,
      syncStatus,
    }),
    [
      equipment,
      addEquipment,
      updateEquipmentField,
      removeEquipment,
      startSample,
      completeStep,
      resolveSample,
      editSample,
      setStepNotes,
      setStepCompleted,
      setStepDate,
      addAction,
      editAction,
      setActionDate,
      removeAction,
      deleteSample,
      resetToDemo,
      activity,
      clearActivity,
      kpiHistory,
      syncStatus,
    ]
  );

  return <LubeOilContext.Provider value={value}>{children}</LubeOilContext.Provider>;
}

export function useLubeOil(): LubeOilContextValue {
  const ctx = useContext(LubeOilContext);
  if (!ctx) throw new Error("useLubeOil must be used within a LubeOilProvider");
  return ctx;
}
