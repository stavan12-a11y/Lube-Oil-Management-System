import { useState } from "react";
import { useAuth } from "./AuthContext";
import {
  AlertIcon,
  DropletIcon,
  LoaderIcon,
  LockIcon,
  LogInIcon,
} from "../components/icons";

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(identifier, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Sign in failed.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-oil-900 to-oil-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <DropletIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">
            Lube Oil Management System
          </h1>
          <p className="text-sm text-oil-200">
            Equipment lubrication &amp; oil analysis compliance tracking
          </p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <LockIcon className="h-5 w-5 text-oil-700" />
            Sign in
          </h2>

          <label className="mb-3 block">
            <span className="label">Username</span>
            <input
              className="input"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertIcon className="h-4 w-4" />
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <LogInIcon className="h-4 w-4" />
            )}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
