import { useMemo, useState } from "react";
import {
  LubeOilProvider,
  useLubeOil,
  equipmentDuplicateInput,
  type NewEquipmentInput,
} from "./store";
import { getUniqueLocations, normalizeLocation } from "./lib/derive";
import { SummaryCards } from "./components/SummaryCards";
import { EquipmentCard } from "./components/EquipmentCard";
import { Sidebar } from "./components/Sidebar";
import { EquipmentDetail } from "./components/EquipmentDetail";
import { AddEquipmentModal } from "./components/AddEquipmentModal";
import { DownloadDataModal } from "./components/DownloadDataModal";
import { ActivityLog } from "./components/ActivityLog";
import { SyncIndicator } from "./components/SyncIndicator";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./auth/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  DownloadIcon,
  DropletIcon,
  HistoryClockIcon,
  LoaderIcon,
  LogOutIcon,
  MapPinIcon,
  PlusIcon,
  RefreshIcon,
} from "./components/icons";

function Dashboard() {
  const { equipment, kpiHistory, resetToDemo } = useLubeOil();
  const { logout } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addEquipmentInitial, setAddEquipmentInitial] = useState<
    NewEquipmentInput | undefined
  >();
  const [showDownload, setShowDownload] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const selected = equipment.find((e) => e.id === selectedId) ?? null;

  function openAddEquipment(initial?: NewEquipmentInput) {
    setAddEquipmentInitial(initial);
    setAdding(true);
  }

  function closeAddEquipment() {
    setAdding(false);
    setAddEquipmentInitial(undefined);
  }

  function duplicateEquipment(equipmentId: string) {
    const source = equipment.find((e) => e.id === equipmentId);
    if (!source) return;
    setSelectedId(null);
    openAddEquipment(equipmentDuplicateInput(source));
  }

  const locations = useMemo(() => getUniqueLocations(equipment), [equipment]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter((e) => {
      if (
        locationFilter !== "all" &&
        normalizeLocation(e.location) !== locationFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.manufacturer.toLowerCase().includes(q) ||
        e.lubricantType.toLowerCase().includes(q) ||
        e.lubricantGrade.toLowerCase().includes(q)
      );
    });
  }, [equipment, locationFilter, query]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-oil-800 bg-oil-900 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <DropletIcon className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold sm:text-lg">
                Lube Oil Management System
              </h1>
              <p className="text-[11px] text-oil-200 sm:text-xs">
                Equipment lubrication &amp; oil analysis compliance tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <SyncIndicator />
            <button
              type="button"
              onClick={() => setShowActivity(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              title="View change history"
            >
              <HistoryClockIcon className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDownload(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              title="Download equipment and KPI data"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Download data</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all data back to the bundled demo program? This cannot be undone."
                  )
                ) {
                  resetToDemo();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              title="Reset to demo data"
            >
              <RefreshIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Reset demo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Sign out of the dashboard?")) logout();
              }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              title="Sign out"
            >
              <LogOutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Lubrication Compliance Overview
          </h2>
          <p className="text-sm text-slate-500">
            Oil sampling status and analysis compliance across all monitored equipment.
          </p>
        </div>

        <SummaryCards equipment={equipment} onSelectEquipment={setSelectedId} />

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Equipment fleet</h3>
              <button
                type="button"
                onClick={() => openAddEquipment()}
                className="btn-primary whitespace-nowrap"
              >
                <PlusIcon className="h-4 w-4" />
                Add equipment
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLocationFilter("all")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    locationFilter === "all"
                      ? "bg-oil-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All locations
                </button>
                {locations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => setLocationFilter(location)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      locationFilter === location
                        ? "bg-oil-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                    {location}
                  </button>
                ))}
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search equipment…"
                className="input w-44 sm:w-52"
              />
            </div>

            {visible.length === 0 ? (
              <div className="card p-10 text-center">
                <DropletIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No equipment matches your filters
                </p>
                <p className="text-xs text-slate-400">
                  Try a different filter or search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    showLocation={locationFilter === "all"}
                    onOpen={() => setSelectedId(item.id)}
                    onDuplicate={() => duplicateEquipment(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <Sidebar equipment={equipment} onSelect={setSelectedId} />
        </div>
      </main>

      {selected && (
        <EquipmentDetail
          equipment={selected}
          onClose={() => setSelectedId(null)}
          onDuplicate={() => duplicateEquipment(selected.id)}
        />
      )}
      {adding && (
        <AddEquipmentModal
          key={addEquipmentInitial?.duplicatedFrom ?? "new"}
          onClose={closeAddEquipment}
          initialValues={addEquipmentInitial}
        />
      )}
      {showDownload && (
        <DownloadDataModal
          equipment={equipment}
          kpiHistory={kpiHistory}
          onClose={() => setShowDownload(false)}
        />
      )}
      {showActivity && <ActivityLog onClose={() => setShowActivity(false)} />}
    </div>
  );
}

function AuthedApp() {
  const { authed, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <LoaderIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!authed) return <LoginScreen />;

  return (
    <LubeOilProvider>
      <Dashboard />
    </LubeOilProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
