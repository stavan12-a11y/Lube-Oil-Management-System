import { describe, expect, it } from "vitest";
import type { Equipment } from "../src/types";
import { emptyLabReadings } from "../src/types";
import {
  getEquipmentStatus,
  getScheduleInfo,
} from "../src/lib/derive";
import { isEquipmentCompliant } from "../src/lib/kpi";

function baseEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "eq_test",
    name: "TEST-1",
    type: "Centrifugal Pump",
    manufacturer: "Test Co",
    location: "Test Bay",
    criticality: "Essential",
    lubricantType: "Turbine Oil",
    lubricantGrade: "ISO VG 32",
    oilCapacityLitres: "45 L",
    samplingIntervalDays: 90,
    activeSample: null,
    history: [],
    ...overrides,
  };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

describe("getEquipmentStatus", () => {
  it("returns 'none' when never sampled", () => {
    expect(getEquipmentStatus(baseEquipment())).toBe("none");
  });

  it("returns 'critical' for an active abnormal sample", () => {
    const eq = baseEquipment({
      activeSample: {
        id: "s1",
        date: dateDaysAgo(1),
        startedAt: isoDaysAgo(1),
        completedAt: null,
        labReportNumber: "",
        notes: "",
        result: "abnormal",
        readings: emptyLabReadings(),
        steps: [],
        actions: [],
        status: "in-progress",
      },
    });
    expect(getEquipmentStatus(eq)).toBe("critical");
  });

  it("returns 'testing' for an active normal, in-progress sample", () => {
    const eq = baseEquipment({
      activeSample: {
        id: "s1",
        date: dateDaysAgo(1),
        startedAt: isoDaysAgo(1),
        completedAt: null,
        labReportNumber: "",
        notes: "",
        result: "normal",
        readings: emptyLabReadings(),
        steps: [],
        actions: [],
        status: "in-progress",
      },
    });
    expect(getEquipmentStatus(eq)).toBe("testing");
  });

  it("returns 'normal' when the most recent archived sample passed", () => {
    const eq = baseEquipment({
      history: [
        {
          id: "s1",
          date: dateDaysAgo(10),
          startedAt: isoDaysAgo(10),
          completedAt: isoDaysAgo(9),
          labReportNumber: "LAB-1",
          notes: "",
          result: "normal",
          readings: emptyLabReadings(),
          steps: [],
          actions: [],
          status: "completed",
        },
      ],
    });
    expect(getEquipmentStatus(eq)).toBe("normal");
  });
});

describe("getScheduleInfo", () => {
  it("flags equipment as overdue once the interval has passed", () => {
    const eq = baseEquipment({
      samplingIntervalDays: 90,
      history: [
        {
          id: "s1",
          date: dateDaysAgo(120),
          startedAt: isoDaysAgo(120),
          completedAt: isoDaysAgo(118),
          labReportNumber: "LAB-1",
          notes: "",
          result: "normal",
          readings: emptyLabReadings(),
          steps: [],
          actions: [],
          status: "completed",
        },
      ],
    });
    const schedule = getScheduleInfo(eq);
    expect(schedule.isOverdue).toBe(true);
    expect(schedule.daysOverdue).toBeGreaterThan(0);
  });

  it("flags equipment as due soon within the warning window", () => {
    const eq = baseEquipment({
      samplingIntervalDays: 90,
      history: [
        {
          id: "s1",
          date: dateDaysAgo(80),
          startedAt: isoDaysAgo(80),
          completedAt: isoDaysAgo(78),
          labReportNumber: "LAB-1",
          notes: "",
          result: "normal",
          readings: emptyLabReadings(),
          steps: [],
          actions: [],
          status: "completed",
        },
      ],
    });
    const schedule = getScheduleInfo(eq);
    expect(schedule.isOverdue).toBe(false);
    expect(schedule.isDueSoon).toBe(true);
  });

  it("never treats never-sampled equipment as overdue", () => {
    const eq = baseEquipment({ samplingIntervalDays: 30 });
    const schedule = getScheduleInfo(eq);
    expect(schedule.isOverdue).toBe(false);
  });
});

describe("isEquipmentCompliant", () => {
  it("is true only when normal and not overdue", () => {
    const compliant = baseEquipment({
      samplingIntervalDays: 90,
      history: [
        {
          id: "s1",
          date: dateDaysAgo(10),
          startedAt: isoDaysAgo(10),
          completedAt: isoDaysAgo(9),
          labReportNumber: "LAB-1",
          notes: "",
          result: "normal",
          readings: emptyLabReadings(),
          steps: [],
          actions: [],
          status: "completed",
        },
      ],
    });
    expect(isEquipmentCompliant(compliant)).toBe(true);

    const overdue = baseEquipment({
      samplingIntervalDays: 30,
      history: [
        {
          id: "s2",
          date: dateDaysAgo(60),
          startedAt: isoDaysAgo(60),
          completedAt: isoDaysAgo(59),
          labReportNumber: "LAB-2",
          notes: "",
          result: "normal",
          readings: emptyLabReadings(),
          steps: [],
          actions: [],
          status: "completed",
        },
      ],
    });
    expect(isEquipmentCompliant(overdue)).toBe(false);
  });
});
