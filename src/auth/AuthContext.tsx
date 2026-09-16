import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cloudCheckSession,
  cloudLogin,
  cloudLogout,
  isCloudBuildDisabled,
  isCloudBuildFlag,
  probeCloudHealth,
} from "../lib/cloudApi";

// ---------------------------------------------------------------------------
// Login modes (detected at runtime):
// • Cloud API: Vercel `/api/*` + Neon, once DATABASE_URL / TEAM_PASSWORD /
//   AUTH_SECRET are all configured on the server (checked via `/api/health`),
//   or when VITE_CLOUD_MODE=true is forced at build time.
// • Local: per-browser localStorage + static password.
//
// Note: `/api/ping` alone is NOT a reliable signal — Vercel deploys the
// `api/` folder unconditionally, so it always responds even when no cloud
// env vars are configured. Using it to decide "cloud mode" would make a
// fresh, zero-config Vercel deploy try (and fail) to log in against a
// database that was never set up.
// ---------------------------------------------------------------------------

const LOCAL_USERNAME = import.meta.env.VITE_APP_USERNAME ?? "admin";
const LOCAL_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? "lube-oil-2026";

const LOCAL_STORAGE_KEY = "lube-oil-auth-v1";

interface AuthContextValue {
  authed: boolean;
  ready: boolean;
  mode: "cloud" | "local";
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLocalAuthed(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cloudApiActive, setCloudApiActive] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      let useCloud = isCloudBuildFlag();
      if (!useCloud && !isCloudBuildDisabled()) {
        const health = await probeCloudHealth();
        useCloud = health.ok;
      }

      if (!active) return;
      setCloudApiActive(useCloud);

      if (useCloud) {
        const sessionOk = await cloudCheckSession();
        if (!active) return;
        setAuthed(sessionOk);
      } else {
        setAuthed(readLocalAuthed());
      }

      if (!active) return;
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      if (cloudApiActive) {
        const res = await cloudLogin(identifier, password);
        if (res.ok) {
          try {
            localStorage.removeItem("lube-oil-management:v1");
            localStorage.removeItem("lube-oil-management:activity:v1");
            localStorage.removeItem("lube-oil-management:kpi-history:v1");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          } catch {
            // ignore
          }
          setAuthed(true);
        }
        return res;
      }

      const ok =
        identifier.trim() === LOCAL_USERNAME && password === LOCAL_PASSWORD;
      if (ok) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, "1");
        } catch {
          // ignore
        }
        setAuthed(true);
        return { ok: true };
      }
      return { ok: false, error: "Incorrect username or password." };
    },
    [cloudApiActive],
  );

  const logout = useCallback(async () => {
    if (cloudApiActive) {
      await cloudLogout();
      setAuthed(false);
      return;
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  }, [cloudApiActive]);

  const mode: "cloud" | "local" = cloudApiActive ? "cloud" : "local";

  const value = useMemo<AuthContextValue>(
    () => ({ authed, ready, mode, login, logout }),
    [authed, ready, mode, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
