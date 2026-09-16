import type { CorrectiveAction, Equipment, LabReadings } from "../types";

const DAY = 1000 * 60 * 60 * 24;

function iso(daysAgo: number, hour = 9): string {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
}

function readings(overrides: Partial<LabReadings> = {}): LabReadings {
  return {
    viscosity40: "",
    viscosity100: "",
    viscosityIndex: "",
    waterPpm: "",
    tan: "",
    isoCleanliness: "",
    ferrousWearPpm: "",
    flashPointC: "",
    ...overrides,
  };
}

function action(daysAgo: number, description: string): CorrectiveAction {
  return { id: `act_${daysAgo}_${description.length}`, loggedAt: iso(daysAgo, 11), description };
}

export function createDemoEquipment(): Equipment[] {
  return [
    // GREEN — normal & filed, with a past abnormal-then-resolved episode in history
    {
      id: "eq_p101a",
      name: "P-101A",
      type: "Centrifugal Pump",
      manufacturer: "Flowserve",
      location: "Pump House — Unit 1",
      criticality: "Critical",
      lubricantType: "Turbine Oil",
      lubricantGrade: "ISO VG 32 — Mobil DTE Oil Light",
      oilCapacityLitres: "45 L",
      samplingIntervalDays: 90,
      activeSample: null,
      history: [
        {
          id: "smp_p101a_current",
          date: dateOnly(12),
          startedAt: iso(12, 8),
          completedAt: iso(12, 8),
          labReportNumber: "LAB-2026-0412",
          labReportFileName: "insight-labs-LAB-2026-0412.pdf",
          notes: "Quarterly routine sample. All readings within normal range.",
          result: "normal",
          readings: readings({
            viscosity40: "31.8",
            viscosity100: "5.4",
            viscosityIndex: "102",
            waterPpm: "68",
            tan: "0.12",
            isoCleanliness: "16/14/11",
            ferrousWearPpm: "8",
            flashPointC: "214",
          }),
          actions: [],
          status: "completed",
        },
        {
          id: "smp_p101a_prev",
          date: dateOnly(380),
          startedAt: iso(380, 8),
          completedAt: iso(372, 15),
          labReportNumber: "LAB-2025-1187",
          notes:
            "Elevated water content detected (412 ppm) — traced to a leaking cooler gasket.",
          result: "abnormal",
          readings: readings({
            viscosity40: "33.1",
            waterPpm: "412",
            tan: "0.31",
            isoCleanliness: "20/18/15",
            ferrousWearPpm: "22",
          }),
          actions: [
            action(376, "Replaced leaking cooler gasket and drained condensate."),
            action(373, "Full oil change — 45L Mobil DTE Oil Light, filter replaced."),
          ],
          status: "completed",
        },
      ],
    },

    // AMBER — sample drawn and sent out, awaiting the lab report
    {
      id: "eq_c201",
      name: "C-201",
      type: "Screw Compressor",
      manufacturer: "Atlas Copco",
      location: "Utility Building",
      criticality: "Essential",
      lubricantType: "Compressor Oil",
      lubricantGrade: "ISO VG 46 — Roto-Z",
      oilCapacityLitres: "80 L",
      samplingIntervalDays: 60,
      activeSample: {
        id: "smp_c201_active",
        date: dateOnly(3),
        startedAt: iso(3, 9),
        completedAt: null,
        labReportNumber: "",
        notes: "Routine bi-monthly sample, sent to Insight Labs — awaiting report.",
        result: null,
        readings: readings(),
        actions: [],
        status: "in-progress",
      },
      history: [],
    },

    // RED — abnormal result, corrective actions underway, unresolved
    {
      id: "eq_gb301",
      name: "GB-301",
      type: "Gearbox",
      manufacturer: "Flender",
      location: "Mill Line 3",
      criticality: "Critical",
      lubricantType: "Gear Oil",
      lubricantGrade: "ISO VG 220 — Mobilgear 600 XP 220",
      oilCapacityLitres: "160 L",
      samplingIntervalDays: 90,
      activeSample: {
        id: "smp_gb301_active",
        date: dateOnly(5),
        startedAt: iso(5, 9),
        completedAt: null,
        labReportNumber: "LAB-2026-0456",
        labReportFileName: "insight-labs-LAB-2026-0456.pdf",
        notes:
          "Abnormal: ferrous wear 142 ppm and water content 610 ppm — indicates active gear wear and possible seal ingress.",
        result: "abnormal",
        readings: readings({
          viscosity40: "225",
          waterPpm: "610",
          tan: "0.42",
          isoCleanliness: "22/20/17",
          ferrousWearPpm: "142",
        }),
        actions: [
          action(3, "Inspected input shaft seal — found worn lip seal, ordered replacement."),
          action(1, "Drained and replaced 160L Mobilgear 600 XP 220, changed breather filter."),
        ],
        status: "in-progress",
      },
      history: [
        {
          id: "smp_gb301_prev",
          date: dateOnly(190),
          startedAt: iso(190, 9),
          completedAt: iso(190, 9),
          labReportNumber: "LAB-2025-0921",
          notes: "Routine sample — normal.",
          result: "normal",
          readings: readings({ viscosity40: "221", waterPpm: "54", ferrousWearPpm: "11" }),
          actions: [],
          status: "completed",
        },
      ],
    },

    // GREEN status, but OVERDUE — last normal sample was too long ago
    {
      id: "eq_tb401",
      name: "TB-401",
      type: "Steam Turbine",
      manufacturer: "Elliott",
      location: "Turbine Hall",
      criticality: "Critical",
      lubricantType: "Turbine Oil",
      lubricantGrade: "ISO VG 32 — Mobil DTE 797",
      oilCapacityLitres: "1,900 L",
      samplingIntervalDays: 90,
      activeSample: null,
      history: [
        {
          id: "smp_tb401_prev",
          date: dateOnly(140),
          startedAt: iso(140, 8),
          completedAt: iso(140, 8),
          labReportNumber: "LAB-2025-1042",
          notes: "Last routine sample — normal, but next round is now overdue.",
          result: "normal",
          readings: readings({ viscosity40: "31.5", waterPpm: "45", tan: "0.09" }),
          actions: [],
          status: "completed",
        },
      ],
    },

    // GREEN status, DUE SOON
    {
      id: "eq_hy601",
      name: "HY-601",
      type: "Hydraulic Power Unit",
      manufacturer: "Bosch Rexroth",
      location: "Press Shop",
      criticality: "Essential",
      lubricantType: "Hydraulic Oil",
      lubricantGrade: "ISO VG 68 — Mobil DTE 26",
      oilCapacityLitres: "300 L",
      samplingIntervalDays: 90,
      activeSample: null,
      history: [
        {
          id: "smp_hy601_prev",
          date: dateOnly(80),
          startedAt: iso(80, 8),
          completedAt: iso(80, 8),
          labReportNumber: "LAB-2026-0088",
          notes: "Routine sample — normal, next round due soon.",
          result: "normal",
          readings: readings({ viscosity40: "67.2", waterPpm: "38", isoCleanliness: "15/13/10" }),
          actions: [],
          status: "completed",
        },
      ],
    },

    // GRAY — brand-new equipment, never sampled yet
    {
      id: "eq_bl701",
      name: "BL-701",
      type: "Cooling Tower Fan",
      manufacturer: "Baltimore Aircoil",
      location: "Cooling Tower Yard",
      criticality: "Non-Critical",
      lubricantType: "Grease",
      lubricantGrade: "NLGI 2 — Mobilith SHC 460",
      oilCapacityLitres: "N/A (grease)",
      samplingIntervalDays: 10,
      activeSample: null,
      history: [],
    },
  ];
}
